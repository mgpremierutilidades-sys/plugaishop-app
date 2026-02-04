Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pushOut = & git push 2>&1
$code = $LASTEXITCODE

if ($code -ne 0) {
  throw "git push failed (exit=$code): $pushOut"
}

if ($pushOut -match "Everything up-to-date") {
  Write-Host "[autoflow] push: noop"
} else {
  Write-Host "[autoflow] push: ok"
}

exit 0
