# scripts/ai/health-check.ps1
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

$targets = "state_exporter|agent_loop|planner_autonomo|bundle_daemon"

$procs = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match "python" -and $_.CommandLine -match $targets } |
  Select-Object ProcessId, CommandLine

$procs | Format-Table -AutoSize

$latest = Test-Path "handoff\state_bundles\latest.zip"
"latest.zip exists? $latest"

if (-not $latest) {
  Write-Host "WARNING: state bundle not found at handoff\state_bundles\latest.zip"
  Write-Host "Searching for any latest.zip under handoff..."
  Get-ChildItem "handoff" -Recurse -Filter "latest.zip" -ErrorAction SilentlyContinue |
    Select-Object FullName, LastWriteTime |
    Format-Table -AutoSize
}

# Exit codes (useful for automation)
# 0 = OK enough; 2 = no processes; 3 = missing latest.zip
if (-not $procs -or $procs.Count -eq 0) { exit 2 }
if (-not $latest) { exit 3 }
exit 0
