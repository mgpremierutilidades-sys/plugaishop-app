$root = (Resolve-Path ".").Path
$p = Join-Path $root "scripts/ai/_out/AUTONOMY_OK.txt"
"OK $(Get-Date -Format s)" | Set-Content -Encoding UTF8 $p
Write-Host "WROTE: $p"
