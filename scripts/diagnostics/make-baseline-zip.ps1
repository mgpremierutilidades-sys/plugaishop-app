# scripts/diagnostics/make-baseline-zip.ps1
# Gera um ZIP do estado atual (sem node_modules/.expo/.git) para virar baseline arquivado.

$ErrorActionPreference = "Stop"

$ProjectPath = "C:\plugaishop-app"
$OutZip = Join-Path $env:USERPROFILE ("Desktop\plugaishop-baseline-opacidade-ok_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".zip")

if (-not (Test-Path $ProjectPath)) { throw "Pasta não encontrada: $ProjectPath" }
if (Test-Path $OutZip) { Remove-Item $OutZip -Force }

$ExcludeDirs = @("node_modules",".expo",".expo-shared","dist","build","out",".next",".turbo",".cache",".parcel-cache","coverage",".git")

$TempRoot = Join-Path $env:TEMP ("plugaishop_zip_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempRoot | Out-Null

try {
  Copy-Item -Path (Join-Path $ProjectPath "*") -Destination $TempRoot -Recurse -Force

  foreach ($dir in $ExcludeDirs) {
    Get-ChildItem -Path $TempRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -ieq $dir } |
      ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
  }

  Compress-Archive -Path (Join-Path $TempRoot "*") -DestinationPath $OutZip -CompressionLevel Optimal -ErrorAction Stop
  Write-Host "OK. Baseline ZIP gerado em: $OutZip"
}
finally {
  Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
