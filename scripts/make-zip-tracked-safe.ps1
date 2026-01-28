# scripts/make-zip-tracked-safe.ps1
# Gera um ZIP com TODOS os arquivos rastreados pelo Git (máximo útil, sem lixo/segredos não rastreados).
# Uso:
#   .\scripts\make-zip-tracked-safe.ps1
#   .\scripts\make-zip-tracked-safe.ps1 -OutZip "plugaishop-tracked.zip"

param(
  [string]$OutZip = "plugaishop-tracked-safe.zip"
)

$ErrorActionPreference = "Stop"

# Verifica se estamos em um repo git
git rev-parse --is-inside-work-tree *> $null

$Root = (Resolve-Path ".").Path
$ZipPath = Join-Path $Root $OutZip

$Guid = [guid]::NewGuid().ToString("N")
$Stage = Join-Path $env:TEMP "plugaishop_tracked_$Guid"
New-Item -ItemType Directory -Path $Stage -Force | Out-Null

function Ensure-Dir([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return }
  if (-not (Test-Path $path -PathType Container)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

try {
  # Lista todos os arquivos rastreados (paths relativos)
  $files = git ls-files

  foreach ($rel in $files) {
    $src = Join-Path $Root $rel
    if (-not (Test-Path $src -PathType Leaf)) { continue }

    $dest = Join-Path $Stage $rel
    Ensure-Dir (Split-Path $dest -Parent)
    Copy-Item -LiteralPath $src -Destination $dest -Force
  }

  if (Test-Path $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
  Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $ZipPath -Force

  Write-Host "ZIP gerado: $ZipPath"
  Write-Host ("Arquivos incluídos (tracked): {0}" -f $files.Count)
}
finally {
  if (Test-Path $Stage) { Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue }
}
