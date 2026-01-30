# scripts/support-bundle.ps1
# Gera export estático do Expo Router + compacta em ZIP na raiz do repo.
# Uso:
#   npm run support:bundle
#   npm run support:bundle:web

param(
  [switch]$WebOnly
)

$ErrorActionPreference = "Stop"

# Repo root = pasta acima de /scripts
$ROOT = Split-Path -Parent $PSScriptRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir = if ($WebOnly) { Join-Path $ROOT "dist-web" } else { Join-Path $ROOT "dist-support" }
$zipName = if ($WebOnly) { "_plugaishop_support_bundle_web_$stamp.zip" } else { "_plugaishop_support_bundle_$stamp.zip" }
$zipPath = Join-Path $ROOT $zipName

Write-Host "=== Plugaishop Support Bundle ===" -ForegroundColor Cyan
Write-Host "ROOT:   $ROOT"
Write-Host "OUTDIR: $outDir"
Write-Host "ZIP:    $zipPath"
$modeLabel = if ($WebOnly) { "web-only" } else { "all-platforms" }
Write-Host "MODE:   $modeLabel"
Write-Host ""

# Limpa saída anterior para evitar artefatos antigos
if (Test-Path $outDir) {
  Write-Host "Cleaning output dir..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force $outDir
}

# Export
if ($WebOnly) {
  Write-Host "Running: npx expo export --platform web --output-dir dist-web --dump-sourcemap" -ForegroundColor Green
  & npx expo export --platform web --output-dir dist-web --dump-sourcemap
} else {
  Write-Host "Running: npx expo export --platform all --output-dir dist-support" -ForegroundColor Green
  & npx expo export --platform all --output-dir dist-support
}

if ($LASTEXITCODE -ne 0) {
  throw "Expo export failed with exit code $LASTEXITCODE"
}

# Zip
Write-Host ""
Write-Host "Compressing..." -ForegroundColor Green
Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath -Force

if (!(Test-Path $zipPath)) {
  throw "ZIP not created: $zipPath"
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "OUTDIR: $outDir"
Write-Host "ZIP: $zipPath"
