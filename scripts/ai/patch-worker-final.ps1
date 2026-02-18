param([string]$ProjectRoot = "E:\plugaishop-app")

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

Write-Host "[patch-worker-final] OK (noop) | ProjectRoot=$ProjectRoot"
exit 0
