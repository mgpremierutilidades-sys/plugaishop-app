# scripts/ai/health-check.ps1
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

$expected = @(
  @{ name="planner";        match="planner_autonomo\.py"; err="handoff\logs\planner.err.log" },
  @{ name="agent_loop";     match="agent_loop\.py";       err="handoff\logs\agent_loop.err.log" },
  @{ name="state_exporter"; match="state_exporter\.py";   err="handoff\logs\state_exporter.err.log" }
)

# bundle_daemon is optional (only if present in this repo)
if (Test-Path (Join-Path $RepoRoot "scripts\ai\bundle_daemon.py")) {
  $expected += @{ name="bundle_daemon"; match="bundle_daemon\.py"; err="handoff\logs\bundle_daemon.err.log" }
}

$procs = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match "python" } |
  Select-Object ProcessId, CommandLine

$running = @()
foreach ($e in $expected) {
  $m = $procs | Where-Object { $_.CommandLine -match $e.match }
  if ($m) { $running += $m }
}

$running | Format-Table -AutoSize

$latest = Test-Path "handoff\state_bundles\latest.zip"
"latest.zip exists? $latest"

function TailIfMissing($name, $match, $log) {
  $has = $running | Where-Object { $_.CommandLine -match $match }
  if (-not $has) {
    $p = Join-Path $RepoRoot $log
    if (Test-Path $p) {
      Write-Host ""
      Write-Host "---- $name missing; tail 120: $log ----"
      Get-Content $p -Tail 120
      Write-Host "---- end tail ----"
    } else {
      Write-Host ""
      Write-Host "---- $name missing; no log found at: $log ----"
    }
  }
}

foreach ($e in $expected) {
  TailIfMissing $e.name $e.match $e.err
}

if (-not $latest) { exit 3 }

$missing = @()
foreach ($e in $expected) {
  $has = $running | Where-Object { $_.CommandLine -match $e.match }
  if (-not $has) { $missing += $e.name }
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host ("MISSING: {0}" -f ($missing -join ", "))
  exit 4
}

exit 0
