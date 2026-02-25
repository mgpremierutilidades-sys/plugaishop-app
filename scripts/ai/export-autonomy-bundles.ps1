#requires -Version 7.2
<#
EXPORT-AUTONOMY-BUNDLES
- Gera ZIPs com arquivos que comprovam autonomia (fila -> executor -> gates -> scheduler/CI -> reports).
- Fail-fast: não gera ZIP parcial. Se faltar arquivo crítico, encerra com erro claro.
- Gera manifest.json + hashes.sha256 para integridade.

Uso:
  pwsh -File .\scripts\ai\export-autonomy-bundles.ps1
  pwsh -File .\scripts\ai\export-autonomy-bundles.ps1 -OutDir "_autonomy_bundle" -IncludeNodeModules:$false

Opcional (override de paths/padrões):
  pwsh -File .\scripts\ai\export-autonomy-bundles.ps1 -OverridesFile ".\scripts\ai\autonomy-overrides.json"

Formato de overrides JSON:
{
  "Core": ["tools/autonomy-core/executor.ps1"],
  "Queue": ["ops/backlog.queue.yml"],
  "Worker": ["scripts/ai/queue-worker.ps1"],
  "Gates": ["scripts/ci/smoke.mjs"],
  "CI": [".github/workflows/ci.yml"],
  "Metadata": ["package.json"]
}
#>

[CmdletBinding()]
param(
  [string]$OutDir = "_autonomy_bundle",
  [string]$RepoRoot = "",
  [string]$OverridesFile = "",
  [switch]$IncludeNodeModules = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor Cyan
  Write-Host ("  " + $Title) -ForegroundColor Yellow
  Write-Host ("=" * 72) -ForegroundColor Cyan
}

function Fail([string]$Message) {
  Write-Host ""
  Write-Host ("FATAL: " + $Message) -ForegroundColor Red
  exit 1
}

function Resolve-RepoRoot([string]$MaybeRoot) {
  if ($MaybeRoot -and (Test-Path -LiteralPath $MaybeRoot)) {
    return (Resolve-Path -LiteralPath $MaybeRoot).Path
  }

  $here = (Get-Location).Path

  # Sobe até achar .git ou package.json
  $cursor = $here
  while ($true) {
    if (Test-Path -LiteralPath (Join-Path $cursor ".git")) { return $cursor }
    if (Test-Path -LiteralPath (Join-Path $cursor "package.json")) { return $cursor }

    $parent = Split-Path -Parent $cursor
    if (-not $parent -or $parent -eq $cursor) { break }
    $cursor = $parent
  }

  Fail "Não consegui detectar RepoRoot. Rode dentro do repo ou passe -RepoRoot."
}

function Normalize-RelPath([string]$Root, [string]$PathLike) {
  if ([string]::IsNullOrWhiteSpace($PathLike)) { return $null }
  $full = $PathLike
  if (-not [System.IO.Path]::IsPathRooted($PathLike)) {
    $full = Join-Path $Root $PathLike
  }
  return (Resolve-Path -LiteralPath $full -ErrorAction Stop).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-FilesByPatterns([string]$Root, [string[]]$Patterns, [string]$Label) {
  $found = New-Object System.Collections.Generic.List[string]
  foreach ($p in $Patterns) {
    # Pattern pode ser path direto (com/sem wildcard)
    $literal = Join-Path $Root $p

    # Se for path sem wildcard e existir, pega direto
    if ($p -notmatch '[\*\?]' -and (Test-Path -LiteralPath $literal)) {
      $found.Add((Resolve-Path -LiteralPath $literal).Path)
      continue
    }

    # Se tiver wildcard, usa Get-ChildItem com -Filter (quando possível) e fallback
    $dir = Split-Path -Parent $literal
    $leaf = Split-Path -Leaf $literal

    if (Test-Path -LiteralPath $dir) {
      $items = Get-ChildItem -Path $dir -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like $literal }
      foreach ($it in $items) { $found.Add($it.FullName) }
    }
  }

  # Dedup + ordena
  return $found | Sort-Object -Unique
}

function Require-AtLeastOne([string[]]$Files, [string]$What) {
  if (-not $Files -or $Files.Count -lt 1) {
    Fail "Nenhum arquivo encontrado para: $What"
  }
}

function Require-AllExist([string]$Root, [string[]]$Paths, [string]$What) {
  foreach ($p in $Paths) {
    $literal = Join-Path $Root $p
    if ($p -match '[\*\?]') { continue } # wildcard validado em patterns
    if (-not (Test-Path -LiteralPath $literal)) {
      Fail "Arquivo obrigatório não encontrado ($What): $p"
    }
  }
}

function Copy-IntoStaging([string]$Root, [string]$StageDir, [string[]]$Files) {
  foreach ($f in $Files) {
    # Preserva estrutura relativa ao repo
    $rel = $f.Substring($Root.Length).TrimStart('\','/')
    $dest = Join-Path $StageDir $rel
    $destDir = Split-Path -Parent $dest
    Ensure-Dir $destDir
    Copy-Item -LiteralPath $f -Destination $dest -Force
  }
}

function New-Zip([string]$ZipPath, [string]$StageDir) {
  if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
  }
  Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $ZipPath -Force
}

function Sha256File([string]$FilePath) {
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $FilePath).Hash.ToLowerInvariant()
}

Write-Section "EXPORT AUTONOMY BUNDLES"
$root = Resolve-RepoRoot $RepoRoot
Write-Host ("RepoRoot: " + $root) -ForegroundColor Green

# Carrega overrides se existir
$over = $null
if ($OverridesFile) {
  $ovPath = Join-Path $root $OverridesFile
  if (-not (Test-Path -LiteralPath $ovPath)) { Fail "OverridesFile não encontrado: $OverridesFile" }
  $over = Get-Content -LiteralPath $ovPath -Raw | ConvertFrom-Json
  Write-Host ("Overrides carregados: " + $OverridesFile) -ForegroundColor Green
}

# =============================
# Definição de bundles (padrões)
# =============================
# Observação: usamos padrões amplos e também paths diretos conhecidos.
# Se o seu repo tiver paths diferentes, use -OverridesFile.

$bundleSpec = [ordered]@{
  "01-Core" = @{
    RequiredExact = @(
      "backlog.queue.yml" # se estiver na raiz; se não, patterns abaixo cobrem
    )
    Patterns = @(
      "backlog.queue.yml",
      "ops/backlog.queue.yml",
      "**/backlog.queue.yml",
      "**/backlog_bridge.ps1",
      "**/executor.ps1",
      "**/rollback.ps1",
      "**/report.ps1"
    )
    Notes = "Fila + bridge + executor + rollback + report"
  }

  "02-WorkerLoop" = @{
    RequiredExact = @()
    Patterns = @(
      "scripts/ai/*worker*.ps1",
      "scripts/ai/*loop*.ps1",
      "tools/**/run.mjs",
      "tools/**/worker*.js",
      "tools/**/worker*.mjs",
      "tools/**/queue*.ps1",
      "tools/**/queue*.js",
      "tools/**/queue*.mjs"
    )
    Notes = "Loop/worker (quem roda continuamente) + runner Node (se existir)"
  }

  "03-Gates-CI" = @{
    RequiredExact = @(
      "package.json",
      "tsconfig.json",
      "eslint.config.js"
    )
    Patterns = @(
      ".github/workflows/*.yml",
      ".github/workflows/*.yaml",
      "scripts/ai/fix-all.ps1",
      "scripts/ai/run_ai_patch.ps1",
      "scripts/ai/*smoke*.ps1",
      "scripts/ci/*smoke*.mjs",
      "scripts/ci/*.mjs",
      "scripts/ai/*tsc*.ps1",
      "scripts/ai/*export*.ps1"
    )
    Notes = "Gates (lint/tsc/smoke) + workflows (incluindo schedule) + scripts CI"
  }

  "04-Orchestrator-Data" = @{
    RequiredExact = @()
    Patterns = @(
      "tools/maxximus-orchestrator/data/metrics.json",
      "tools/maxximus-orchestrator/data/state.json",
      "tools/maxximus-orchestrator/data/tasks.json",
      "tools/maxximus-orchestrator/data/reports/*.json",
      "scripts/ai/_out/*.txt",
      "scripts/ai/_out/*.json"
    )
    Notes = "Dados do orquestrador + relatórios + contexto exportado"
  }
}

# Aplica overrides (substitui lista por bundle, se informado)
if ($over) {
  foreach ($k in @("Core","Queue","Worker","Gates","CI","Metadata")) { } # só para referência

  # Map simples: keys do JSON -> bundles
  if ($over.Core) { $bundleSpec["01-Core"].Patterns = @($over.Core) }
  if ($over.Queue) { $bundleSpec["01-Core"].Patterns += @($over.Queue) }
  if ($over.Worker) { $bundleSpec["02-WorkerLoop"].Patterns = @($over.Worker) }
  if ($over.Gates) { $bundleSpec["03-Gates-CI"].Patterns += @($over.Gates) }
  if ($over.CI) { $bundleSpec["03-Gates-CI"].Patterns += @($over.CI) }
  if ($over.Metadata) { $bundleSpec["03-Gates-CI"].Patterns += @($over.Metadata) }
}

# Validar required exact básicos (quando fazem sentido)
foreach ($b in $bundleSpec.Keys) {
  $req = $bundleSpec[$b].RequiredExact
  if ($req -and $req.Count -gt 0) {
    Require-AllExist -Root $root -Paths $req -What ("RequiredExact in " + $b)
  }
}

# Preparar saída
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $root $OutDir
Ensure-Dir $out

$stageRoot = Join-Path $out ("_stage_" + $timestamp)
Ensure-Dir $stageRoot

$manifest = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  repoRoot = $root
  outDir = $out
  bundles = @()
}

$hashLines = New-Object System.Collections.Generic.List[string]

Write-Section "COLETANDO ARQUIVOS E GERANDO ZIPs"

foreach ($bundleName in $bundleSpec.Keys) {
  $spec = $bundleSpec[$bundleName]
  $patterns = [string[]]$spec.Patterns

  Write-Host ""
  Write-Host ("-> Bundle: " + $bundleName) -ForegroundColor Cyan
  Write-Host ("   " + $spec.Notes) -ForegroundColor Gray

  $files = Get-FilesByPatterns -Root $root -Patterns $patterns -Label $bundleName
  $files = $files | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  # Opcional: excluir node_modules por segurança/tempo
  if (-not $IncludeNodeModules) {
    $files = $files | Where-Object { $_ -notmatch '[\\/]node_modules[\\/]' }
  }

  Require-AtLeastOne -Files $files -What ("Bundle " + $bundleName)

  $stageDir = Join-Path $stageRoot $bundleName
  Ensure-Dir $stageDir
  Copy-IntoStaging -Root $root -StageDir $stageDir -Files $files

  $zipPath = Join-Path $out ("plugaishop-" + $bundleName + "-" + $timestamp + ".zip")
  New-Zip -ZipPath $zipPath -StageDir $stageDir

  $zipHash = Sha256File -FilePath $zipPath
  $hashLines.Add(($zipHash + "  " + (Split-Path -Leaf $zipPath))) | Out-Null

  $manifest.bundles += [ordered]@{
    name = $bundleName
    notes = $spec.Notes
    fileCount = ($files | Measure-Object).Count
    zip = (Split-Path -Leaf $zipPath)
    sha256 = $zipHash
    examples = ($files | Select-Object -First 8)
  }

  Write-Host ("   OK: " + (Split-Path -Leaf $zipPath)) -ForegroundColor Green
  Write-Host ("   Files: " + ($files.Count)) -ForegroundColor Green
}

# Manifest + hashes
$manifestPath = Join-Path $out ("manifest-" + $timestamp + ".json")
$hashPath = Join-Path $out ("hashes-" + $timestamp + ".sha256")

($manifest | ConvertTo-Json -Depth 20) | Out-File -LiteralPath $manifestPath -Encoding UTF8
$hashLines | Out-File -LiteralPath $hashPath -Encoding ASCII

Write-Section "RESULTADO"
Write-Host ("OutDir: " + $out) -ForegroundColor Green
Write-Host ("Manifest: " + (Split-Path -Leaf $manifestPath)) -ForegroundColor Green
Write-Host ("Hashes:   " + (Split-Path -Leaf $hashPath)) -ForegroundColor Green
Write-Host ""
Write-Host "Envie estes arquivos:" -ForegroundColor Yellow
Get-ChildItem -LiteralPath $out -Filter ("*"+$timestamp+"*") | Select-Object Name, Length | Format-Table -AutoSize

# Cleanup staging (mantém somente ZIPs + manifest + hashes)
try {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force -ErrorAction SilentlyContinue
} catch { }

Write-Host ""
Write-Host "DONE." -ForegroundColor Cyan