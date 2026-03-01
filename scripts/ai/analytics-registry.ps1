<#
Analytics Registry Checker — Plugaishop

Objetivo:
- Encontrar track("event") no repo
- Gerar relatório de eventos encontrados
- Apontar eventos faltando no docs/ANALYTICS_EVENTS.md

Uso:
  pwsh ./scripts/ai/analytics-registry.ps1

Saída:
  scripts/ai/_out/events-found.txt
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

$reportPath = Join-Path $outDir "events-found.txt"
$registryPath = Join-Path $repoRoot "docs/ANALYTICS_EVENTS.md"

Write-Host "🔎 Varredura de eventos track() em: $repoRoot" -ForegroundColor Cyan

# Regex: track("event") ou track('event')
$rx = [regex]'track\(\s*["'']([a-zA-Z0-9_]+)["'']\s*(,|\))'

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
    $ev = $m.Groups[1].Value
    if (-not $found.ContainsKey($ev)) {
      $found[$ev] = New-Object "System.Collections.Generic.List[string]"
    }

    $rel = $f.FullName.Replace($repoRoot, ".").Replace("\", "/")
    if (-not $found[$ev].Contains($rel)) {
      $found[$ev].Add($rel)
    }
  }
}

$allEvents = $found.Keys | Sort-Object

$registryText = ""
$registryEvents = @()
if (Test-Path -LiteralPath $registryPath) {
  $registryText = Get-Content -LiteralPath $registryPath -Raw
  $registryEvents = ([regex]'[a-zA-Z0-9_]+' ).Matches($registryText) | ForEach-Object { $_.Value } |
    Where-Object { $_ -match "^[a-z0-9_]+$" } |
    Sort-Object -Unique
}

$missingInRegistry = $allEvents | Where-Object { $registryEvents -notcontains $_ }

$lines = @()
$lines += "# Eventos encontrados via track()"
$lines += "Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
$lines += ""
$lines += "## Total eventos encontrados: $($allEvents.Count)"
$lines += ""

foreach ($ev in $allEvents) {
  $lines += "### $ev"
  foreach ($p in ($found[$ev] | Sort-Object)) {
    $lines += "- $p"
  }
  $lines += ""
}

$lines += "## Eventos usados mas ausentes no docs/ANALYTICS_EVENTS.md: $($missingInRegistry.Count)"
foreach ($e in $missingInRegistry) { $lines += "- $e" }

Set-Content -LiteralPath $reportPath -Value ($lines -join "`n") -Encoding UTF8

if ($missingInRegistry.Count -gt 0) {
  Write-Host "⚠️ Há eventos faltando no registro: $($missingInRegistry.Count)" -ForegroundColor Yellow
  Write-Host "Abra: $reportPath" -ForegroundColor Yellow
  exit 2
}

Write-Host "✅ OK. Nenhum evento faltando no registro." -ForegroundColor Green
Write-Host "Relatório: $reportPath" -ForegroundColor White