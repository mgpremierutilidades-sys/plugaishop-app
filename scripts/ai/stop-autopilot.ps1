param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [string]$TaskName = "Plugaishop-Autopilot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$stateDir = Join-Path $ProjectRoot "scripts\ai\_state"
$pidPath = Join-Path $stateDir "autopilot.pid"
$lockPath = Join-Path $stateDir "autopilot.lock"

Write-Host "Stopping task (if exists): $TaskName"
try {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null
  }
} catch {}

Write-Host "Stopping process (if pid file exists)"
try {
  if (Test-Path $pidPath) {
    $pid = (Get-Content $pidPath -Raw).Trim()
    if ($pid -match "^\d+$") {
      Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped PID: $pid"
    }
    Remove-Item -Force $pidPath -ErrorAction SilentlyContinue
  }
} catch {}

try { Remove-Item -Force $lockPath -ErrorAction SilentlyContinue } catch {}

Write-Host "Done."
