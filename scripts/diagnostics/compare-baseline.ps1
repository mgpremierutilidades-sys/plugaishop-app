# scripts/diagnostics/compare-baseline.ps1
# Compara um ZIP baseline (bom) com a pasta atual por HASH (rápido e objetivo).
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\diagnostics\compare-baseline.ps1 -BaselineZip "C:\...\baseline.zip"

param(
  [Parameter(Mandatory=$true)][string]$BaselineZip
)

$ErrorActionPreference = "Stop"

$ProjectPath = "C:\plugaishop-app"
if (-not (Test-Path $ProjectPath)) { throw "Projeto não encontrado: $ProjectPath" }
if (-not (Test-Path $BaselineZip)) { throw "BaselineZip não encontrado: $BaselineZip" }

$Temp = Join-Path $env:TEMP ("plugaishop_baseline_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $Temp | Out-Null

try {
  Expand-Archive -Path $BaselineZip -DestinationPath $Temp -Force

  function Get-FileMap($root) {
    $map = @{}
    Get-ChildItem -Path $root -Recurse -File -Force | ForEach-Object {
      $rel = $_.FullName.Substring($root.Length).TrimStart("\","/")
      # ignora lixo comum
      if ($rel -match "^(node_modules|\.expo|\.git|dist|build|out|coverage)[\\/]" ) { return }
      $hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash
      $map[$rel] = $hash
    }
    return $map
  }

  Write-Host "Hashing baseline..."
  $base = Get-FileMap $Temp

  Write-Host "Hashing current project..."
  $curr = Get-FileMap $ProjectPath

  $all = @($base.Keys + $curr.Keys) | Sort-Object -Unique

  $diff = foreach ($k in $all) {
    $b = $base[$k]
    $c = $curr[$k]
    if ($null -eq $b) { [pscustomobject]@{ Status="ADDED"; Path=$k } }
    elseif ($null -eq $c) { [pscustomobject]@{ Status="REMOVED"; Path=$k } }
    elseif ($b -ne $c) { [pscustomobject]@{ Status="CHANGED"; Path=$k } }
  }

  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $out = Join-Path $env:USERPROFILE "Desktop\baseline_diff_$stamp.txt"
  $diff | Format-Table -AutoSize | Out-String -Width 260 | Set-Content -Encoding UTF8 $out

  Write-Host "OK. Diff gerado em: $out"
}
finally {
  Remove-Item $Temp -Recurse -Force -ErrorAction SilentlyContinue
}
