<#
Feature Flags Registry Checker — Plugaishop

Objetivo:
- Encontrar referências a isFlagEnabled("ff_*") no repo
- Gerar relatório de flags encontradas
- Apontar flags faltando no docs/FEATURE_FLAGS.md

Uso:
  pwsh ./scripts/ai/flags-registry.ps1

Saída:
  scripts/ai/_out/flags-found.txt
#>

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$StartPath)
  $dir = Get-Item -LiteralPath $StartPath
  if ($dir -isnot [System.IO.DirectoryInfo]) { $dir = $dir.Directory }

  while ($null -ne $dir) {
    if (Test-Path -LiteralPath (Join-Path $dir.FullName "package.json")) { return $dir.FullName }
    if (Test-Path -LiteralPath (Join-Path $dir.FullName ".git")) { return $dir.FullName }
    $dir = $dir.Parent
  }
  throw "RepoRoot não encontrado (package.json/.git)."
}

$repoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
Set-Location $repoRoot

$outDir = Join-Path $repoRoot "scripts/ai/_out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$reportPath = Join-Path $outDir "flags-found.txt"
$registryPath = Join-Path $repoRoot "docs/FEATURE_FLAGS.md"

Write-Host "🔎 Varredura de flags em: $repoRoot" -ForegroundColor Cyan

# Regex: isFlagEnabled("ff_...") ou isFlagEnabled('ff_...')
$rx = [regex]'isFlagEnabled\(\s*["''](ff_[a-zA-Z0-9_]+)["'']\s*\)'

# arquivos candidatos (ts/tsx/js/jsx)
$files = Get-ChildItem -Recurse -File -Force -Path $repoRoot |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\dist-web\\" -and
    ($_.Extension -in ".ts",".tsx",".js",".jsx")
  }

$found = New-Object System.Collections.Generic.Dictionary[string, System.Collections.Generic.List[string]]

foreach ($f in $files) {
  $text = ""
  try { $text = Get-Content -LiteralPath $f.FullName -Raw } catch { continue }

  $matches = $rx.Matches($text)
  if ($matches.Count -eq 0) { continue }

  foreach ($m in $matches) {
    $flag = $m.Groups[1].Value
    if (-not $found.ContainsKey($flag)) {
      $found[$flag] = New-Object "System.Collections.Generic.List[string]"
    }

    $rel = $f.FullName.Replace($repoRoot, ".").Replace("\", "/")
    if (-not $found[$flag].Contains($rel)) {
      $found[$flag].Add($rel)
    }
  }
}

$allFlags = $found.Keys | Sort-Object

# Carregar registry
$registryText = ""
$registryFlags = @()
if (Test-Path -LiteralPath $registryPath) {
  $registryText = Get-Content -LiteralPath $registryPath -Raw
  $registryFlags = ([regex]'ff_[a-zA-Z0-9_]+' ).Matches($registryText) | ForEach-Object { $_.Value } | Sort-Object -Unique
}

# Diferenças
$missingInRegistry = $allFlags | Where-Object { $registryFlags -notcontains $_ }

# Emit relatório
$lines = @()
$lines += "# Flags encontradas via isFlagEnabled()"
$lines += "Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
$lines += ""

$lines += "## Total flags encontradas: $($allFlags.Count)"
$lines += ""

foreach ($flag in $allFlags) {
  $lines += "### $flag"
  foreach ($p in ($found[$flag] | Sort-Object)) {
    $lines += "- $p"
  }
  $lines += ""
}

$lines += "## Flags usadas mas ausentes no docs/FEATURE_FLAGS.md: $($missingInRegistry.Count)"
foreach ($f in $missingInRegistry) { $lines += "- $f" }

Set-Content -LiteralPath $reportPath -Value ($lines -join "`n") -Encoding UTF8

if ($missingInRegistry.Count -gt 0) {
  Write-Host "⚠️ Há flags faltando no registro: $($missingInRegistry.Count)" -ForegroundColor Yellow
  Write-Host "Abra: $reportPath" -ForegroundColor Yellow
  exit 2
}

Write-Host "✅ OK. Nenhuma flag faltando no registro." -ForegroundColor Green
Write-Host "Relatório: $reportPath" -ForegroundColor White