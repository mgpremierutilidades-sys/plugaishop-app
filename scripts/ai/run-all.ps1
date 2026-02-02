$runAll = Get-Content scripts\ai\run-all.ps1 -Raw

# Substitui a chamada direta do bundle daemon pelo bloco condicional
$runAll = $runAll -replace `
'Start-With-Retry -Name "bundle_daemon" -Args @\("scripts/ai/bundle_daemon\.py"\) -OutLog "handoff\\logs\\bundle_daemon\.out\.log" -ErrLog "handoff\\logs\\bundle_daemon\.err\.log"', `
'$BundleDaemonPath = Join-Path $RepoRoot "scripts\ai\bundle_daemon.py"
if (Test-Path $BundleDaemonPath) {
  $BundleDaemonPath = Join-Path $RepoRoot "scripts\ai\bundle_daemon.py"
if (Test-Path $BundleDaemonPath) {
  Start-With-Retry -Name "bundle_daemon" -Args @("scripts/ai/bundle_daemon.py") -OutLog "handoff\logs\bundle_daemon.out.log" -ErrLog "handoff\logs\bundle_daemon.err.log"
} else {
  Write-Host "INFO: bundle_daemon.py not found; skipping bundle_daemon start."
}
} else {
  Write-Host "INFO: bundle_daemon.py not found; skipping bundle_daemon start."
}'

$runAll | Set-Content -Encoding UTF8 scripts\ai\run-all.ps1

