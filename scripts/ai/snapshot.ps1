# scripts/ai/snapshot.ps1
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

New-Item -ItemType Directory -Force "handoff\requests" | Out-Null

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$zip = "handoff\requests\runtime-snapshot-$ts.zip"

# Capture process list
$procTxt = "handoff\requests\processes-$ts.txt"
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match "python" -and $_.CommandLine -match "state_exporter|agent_loop|planner_autonomo|bundle_daemon" } |
  Select-Object ProcessId, CommandLine |
  Format-Table -AutoSize | Out-String |
  Set-Content -Encoding UTF8 $procTxt

# Create zip (best-effort on missing folders)
$items = @(
  "handoff\logs",
  "handoff\pids",
  "handoff\state_bundles",
  "handoff\commands",
  "handoff\processed",
  "handoff\approvals",
  "handoff\bundle_requests",
  $procTxt
) | Where-Object { Test-Path $_ }

Compress-Archive -Force -Path $items -DestinationPath $zip
Write-Output "Wrote: $zip"
