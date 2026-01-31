# scripts/make-zip-tracked-safe.ps1
# Gera um ZIP com TODOS os arquivos rastreados pelo Git preservando estrutura (sem achatar).
# Uso:
#   .\scripts\make-zip-tracked-safe.ps1
#   .\scripts\make-zip-tracked-safe.ps1 -OutZip "plugaishop-tracked-safe.zip"
#   .\scripts\make-zip-tracked-safe.ps1 -OutZip "plugaishop-tracked-safe.zip" -WriteManifest
#   .\scripts\make-zip-tracked-safe.ps1 -OutZip "plugaishop-tracked-safe.zip" -WriteManifest -ManifestOut "_share/_bundles/home_etapa3_bundle_files.txt"

param(
  [string]$OutZip = "plugaishop-tracked-safe.zip",
  [switch]$WriteManifest,
  [string]$ManifestOut = ""
)

$ErrorActionPreference = "Stop"

function New-DirectoryIfMissing {
  param([Parameter(Mandatory = $true)][string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  if (-not (Test-Path $Path -PathType Container)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

# Verifica se estamos em um repo git
git rev-parse --is-inside-work-tree *> $null

$Root = (Resolve-Path ".").Path
$ZipPath = Join-Path $Root $OutZip

$Guid = [guid]::NewGuid().ToString("N")
$Stage = Join-Path $env:TEMP "plugaishop_tracked_$Guid"
New-Item -ItemType Directory -Path $Stage -Force | Out-Null

try {
  # Lista todos os arquivos rastreados (paths relativos)
  $files = git ls-files

  foreach ($rel in $files) {
    $src = Join-Path $Root $rel
    if (-not (Test-Path $src -PathType Leaf)) { continue }

    $dest = Join-Path $Stage $rel
    New-DirectoryIfMissing -Path (Split-Path $dest -Parent)
    Copy-Item -LiteralPath $src -Destination $dest -Force
  }

  if (Test-Path $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
  Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $ZipPath -Force

  if ($WriteManifest) {
    $manifestPath =
      if (-not [string]::IsNullOrWhiteSpace($ManifestOut)) {
        Join-Path $Root $ManifestOut
      } else {
        Join-Path $Root "_share/_bundles/_bundle_files.txt"
      }

    New-DirectoryIfMissing -Path (Split-Path $manifestPath -Parent)
    $files | Out-File -Encoding utf8 $manifestPath
    Write-Host "Manifest gerado: $manifestPath"
  }

  Write-Host "ZIP gerado: $ZipPath"
  Write-Host ("Arquivos incluídos (tracked): {0}" -f $files.Count)
}
finally {
  if (Test-Path $Stage) { Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue }
}
