# scripts/ai/stop-all.ps1
$ErrorActionPreference = "SilentlyContinue"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

$targets = @(
  "scripts/ai/agent_loop\.py",
  "scripts/ai/planner_autonomo\.py",
  "scripts/ai/bundle_daemon\.py",
  "state_exporter\.py"
)

$all = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match "python" } |
  Select-Object ProcessId, CommandLine

$toKill = @()
foreach ($p in $all) {
  foreach ($t in $targets) {
    if ($p.CommandLine -match $t) {
      $toKill += $p
      break
    }
  }
}

if ($toKill.Count -eq 0) {
  Write-Host "No AI processes matched. Nothing to stop."
  exit 0
}

$toKill | Sort-Object ProcessId -Unique | ForEach-Object {
  Write-Host ("Stopping PID {0} :: {1}" -f $_.ProcessId, $_.CommandLine)
  Stop-Process -Id $_.ProcessId -Force
}

exit 0
