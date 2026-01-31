# scripts/make-zip-tracked-split.ps1
# Gera 2 ZIPs com arquivos rastreados pelo Git (zero atrito, sem lixo untracked).
# - plugaishop-core.zip  -> app/runtime (app/, src/, components/, utils/, etc.)
# - plugaishop-tools.zip -> docs/scripts/tools/.github (governança e automação)
#
# Uso:
#   .\scripts\make-zip-tracked-split.ps1
#   .\scripts\make-zip-tracked-split.ps1 -OutCoreZip "core.zip" -OutToolsZip "tools.zip"
#
# Requer: git no PATH. PowerShell 5.1+.

param(
  [string]$OutCoreZip = "plugaishop-core.zip",
  [string]$OutToolsZip = "plugaishop-tools.zip",
  [switch]$SingleZip,
  [string]$OutSingleZip = "plugaishop-tracked-safe.zip"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Verifica se estamos num repo git
git rev-parse --is-inside-work-tree *> $null

$Root = (git rev-parse --show-toplevel).Trim()
Set-Location $Root

function Ensure-Dir([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return }
  if (-not (Test-Path $path -PathType Container)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Copy-TrackedFiles([string[]]$relFiles, [string]$stageDir) {
  foreach ($rel in $relFiles) {
    $src = Join-Path $Root $rel
    if (-not (Test-Path $src -PathType Leaf)) { continue }

    $dest = Join-Path $stageDir $rel
    Ensure-Dir (Split-Path $dest -Parent)
    Copy-Item -LiteralPath $src -Destination $dest -Force
  }
}

# Prefixos (ajuste se necessário)
$corePrefixes = @(
  "app/",
  "src/",
  "components/",
  "utils/",
  "constants/",
  "hooks/",
  "assets/",
  "providers/",
  "context/",
  "data/",
  "types/",
  "services/",
  "store/",
  "lib/"
)

$toolsPrefixes = @(
  "docs/",
  "scripts/",
  ".github/",
  "tools/",
  "ai/"
)

# Arquivos root importantes (sempre incluir no core)
$coreRootFiles = @(
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "app.json",
  "app.config.js",
  "expo.json",
  "eas.json",
  "babel.config.js",
  "metro.config.js",
  "eslint.config.js",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  "README.md"
)

# Lista todos os arquivos rastreados
$all = @(git ls-files)

function HasPrefix($path, [string[]]$prefixes) {
  foreach ($p in $prefixes) {
    if ($path.StartsWith($p, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
  }
  return $false
}

# Normaliza para barras "/"
$allNorm = $all | ForEach-Object { $_.Replace("\", "/") }

if ($SingleZip) {
  $zipPath = Join-Path $Root $OutSingleZip
  $guid = [guid]::NewGuid().ToString("N")
  $stage = Join-Path $env:TEMP "plugaishop_tracked_$guid"
  New-Item -ItemType Directory -Path $stage -Force | Out-Null

  try {
    Copy-TrackedFiles -relFiles $allNorm -stageDir $stage

    # Manifest
    $manifest = @()
    $manifest += "repo_root=$Root"
    $manifest += "git_branch=$(git rev-parse --abbrev-ref HEAD)"
    $manifest += "git_head=$(git rev-parse HEAD)"
    $manifest += "generated_at=$(Get-Date -Format o)"
    $manifest += "mode=single"
    $manifest | Out-File -FilePath (Join-Path $stage "PACK_MANIFEST.txt") -Encoding utf8

    if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -Force

    Write-Host "ZIP gerado: $zipPath"
    Write-Host ("Arquivos incluídos (tracked): {0}" -f $allNorm.Count)
  }
  finally {
    if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue }
  }

  exit 0
}

# Filtra core/tools
$core = New-Object System.Collections.Generic.List[string]
$tools = New-Object System.Collections.Generic.List[string]

foreach ($p in $allNorm) {
  $isCore = HasPrefix $p $corePrefixes
  $isTools = HasPrefix $p $toolsPrefixes

  if ($isCore -and -not $isTools) { [void]$core.Add($p); continue }
  if ($isTools -and -not $isCore) { [void]$tools.Add($p); continue }

  # Se cair nos dois (ex.: scripts que impactam runtime), manda para tools
  if ($isCore -and $isTools) { [void]$tools.Add($p); continue }

  # Se não bateu em nada, decide:
  # - arquivos de config root vão pro core
  # - demais vão pro tools (conservador)
  if ($coreRootFiles -contains $p) { [void]$core.Add($p) } else { [void]$tools.Add($p) }
}

# Garante inclusão dos arquivos root importantes (se existirem)
foreach ($f in $coreRootFiles) {
  $fNorm = $f.Replace("\", "/")
  if ($allNorm -contains $fNorm) {
    if (-not $core.Contains($fNorm)) { [void]$core.Add($fNorm) }
  }
}

# Stage dirs
$guid2 = [guid]::NewGuid().ToString("N")
$stageBase = Join-Path $env:TEMP "plugaishop_split_$guid2"
$coreStage = Join-Path $stageBase "core"
$toolsStage = Join-Path $stageBase "tools"
New-Item -ItemType Directory -Path $coreStage, $toolsStage -Force | Out-Null

try {
  Copy-TrackedFiles -relFiles $core.ToArray() -stageDir $coreStage
  Copy-TrackedFiles -relFiles $tools.ToArray() -stageDir $toolsStage

  # Manifest em cada zip
  $common = @()
  $common += "repo_root=$Root"
  $common += "git_branch=$(git rev-parse --abbrev-ref HEAD)"
  $common += "git_head=$(git rev-parse HEAD)"
  $common += "generated_at=$(Get-Date -Format o)"
  $common += "mode=split"

  ($common + "bucket=core" + ("files={0}" -f $core.Count)) | Out-File -FilePath (Join-Path $coreStage "PACK_MANIFEST.txt") -Encoding utf8
  ($common + "bucket=tools" + ("files={0}" -f $tools.Count)) | Out-File -FilePath (Join-Path $toolsStage "PACK_MANIFEST.txt") -Encoding utf8

  $coreZip = Join-Path $Root $OutCoreZip
  $toolsZip = Join-Path $Root $OutToolsZip

  if (Test-Path $coreZip) { Remove-Item -LiteralPath $coreZip -Force }
  if (Test-Path $toolsZip) { Remove-Item -LiteralPath $toolsZip -Force }

  Compress-Archive -Path (Join-Path $coreStage "*") -DestinationPath $coreZip -Force
  Compress-Archive -Path (Join-Path $toolsStage "*") -DestinationPath $toolsZip -Force

  Write-Host "ZIPs gerados:"
  Write-Host " - $coreZip"
  Write-Host " - $toolsZip"
  Write-Host ("Arquivos CORE:  {0}" -f $core.Count)
  Write-Host ("Arquivos TOOLS: {0}" -f $tools.Count)
}
finally {
  if (Test-Path $stageBase) { Remove-Item -LiteralPath $stageBase -Recurse -Force -ErrorAction SilentlyContinue }
}
