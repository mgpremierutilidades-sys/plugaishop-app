# scripts/ai/support-bundle.ps1
# Gera um ZIP leve e padronizado para o ChatGPT analisar o projeto sem precisar "ver" o PC.
# - Exclui node_modules, android/ios, .expo e outros pesos
# - Copia apenas o que interessa (app/, src/, components/, utils/, etc.)
# - Gera INDEX_AI.json via Node (se disponível)
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\ai\support-bundle.ps1

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }

$root = (Resolve-Path ".").Path

# Timestamp
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDirName = "_plugaishop_support_bundle_$stamp"
$outDir = Join-Path $root $outDirName
$zipPath = "$outDir.zip"

# Pastas a incluir (existindo)
$includeDirs = @(
  "app",
  "src",
  "components",
  "constants",
  "context",
  "hooks",
  "types",
  "utils",
  "data",
  "scripts",
  "docs"
)

# Arquivos raiz relevantes
$includeRootFiles = @(
  "package.json",
  "app.json",
  "tsconfig.json",
  "eslint.config.js",
  "expo-env.d.ts",
  "README.md",
  ".gitignore"
)

# Exclusões pesadas / sensíveis
$excludeDirNames = @(
  "node_modules",
  ".expo",
  "android",
  "ios",
  "dist",
  "web-build",
  "_export_cart_etapa24",
  "_share",
  "handoff",
  "_upload_"
)

# Arquivos que podem conter segredos (não copiar)
$excludeFilePatterns = @(
  "*.jks",
  "*.p8",
  "*.p12",
  "*.key",
  "*.mobileprovision",
  "google-services.json",
  "GoogleService-Info.plist",
  ".env",
  ".env.*",
  "*.env",
  "*.pem"
)

# 1) Preparar pasta
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Path $outDir | Out-Null

Write-Info "ROOT: $root"
Write-Info "OUTDIR: $outDir"

# 2) Copiar arquivos raiz
foreach ($f in $includeRootFiles) {
  $src = Join-Path $root $f
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $outDir $f) -Force
  }
}

# 3) Copiar diretórios (com filtro)
function Should-ExcludeFile($path) {
  $name = Split-Path $path -Leaf
  foreach ($pat in $excludeFilePatterns) {
    if ($name -like $pat) { return $true }
  }
  return $false
}

function Copy-TreeFiltered($from, $to) {
  New-Item -ItemType Directory -Path $to -Force | Out-Null

  Get-ChildItem -LiteralPath $from -Recurse -Force | ForEach-Object {
    $full = $_.FullName
    $rel = $full.Substring($from.Length).TrimStart("\","/")
    if ([string]::IsNullOrWhiteSpace($rel)) { return }

    # Excluir por diretório em qualquer nível
    foreach ($ex in $excludeDirNames) {
      if ($rel -match "(^|\\|/)$([regex]::Escape($ex))($|\\|/)") { return }
    }

    if ($_.PSIsContainer) {
      $destDir = Join-Path $to $rel
      if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
      }
      return
    }

    if (Should-ExcludeFile $full) { return }

    $destFile = Join-Path $to $rel
    $destParent = Split-Path $destFile -Parent
    if (-not (Test-Path $destParent)) { New-Item -ItemType Directory -Path $destParent -Force | Out-Null }

    Copy-Item $full $destFile -Force
  }
}

foreach ($d in $includeDirs) {
  $srcDir = Join-Path $root $d
  if (Test-Path $srcDir) {
    $dstDir = Join-Path $outDir $d
    Write-Info "Copy: $d"
    Copy-TreeFiltered $srcDir $dstDir
  }
}

# 4) Gerar índice (se Node existir)
$nodeOk = $false
try {
  node -v | Out-Null
  $nodeOk = $true
} catch { $nodeOk = $false }

if ($nodeOk) {
  $indexScript = Join-Path $root "scripts\ai\index-generator.mjs"
  if (Test-Path $indexScript) {
    Write-Info "Gerando INDEX_AI.json (node)..."
    node $indexScript --root $outDir --out (Join-Path $outDir "INDEX_AI.json") | Out-Null
    Write-Ok "INDEX_AI.json OK"
  } else {
    Write-Warn "index-generator.mjs não encontrado. Pulando índice."
  }
} else {
  Write-Warn "Node não encontrado. Pulando índice."
}

# 5) Compactar
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath

Write-Ok "ZIP: $zipPath"
Write-Ok "DONE"
