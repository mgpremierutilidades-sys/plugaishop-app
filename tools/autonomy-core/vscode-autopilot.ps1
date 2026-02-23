param(
  [int]$IntervalSeconds = 900,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$RepoRoot = (Resolve-Path ".").Path
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

$CoreDir  = Join-Path $RepoRoot "tools/autonomy-core"
$StateDir = Join-Path $CoreDir "_state"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$lockPath = Join-Path $StateDir "vscode-autopilot.lock"
$stopPath = Join-Path $StateDir "vscode-autopilot.stop"

function Log([string]$m) {
  $ts = (Get-Date).ToString("s")
  Write-Host ("[VS-AUTOPILOT] [$ts] " + $m)
}

function RunCmd([string]$cmd) {
  Log ("$ " + $cmd)
  cmd /c $cmd
  return $LASTEXITCODE
}

function GitBranch() { try { return (git rev-parse --abbrev-ref HEAD).Trim() } catch { return "" } }

# single instance (best effort)
try {
  if (Test-Path $lockPath) {
    $age = (Get-Item $lockPath).LastWriteTime
    if ((New-TimeSpan -Start $age -End (Get-Date)).TotalMinutes -lt 120) {
      Log "Lock exists and is recent. Exiting (avoid double instance)."
      exit 0
    }
  }
  Set-Content -Path $lockPath -Value ("pid=" + $PID) -Encoding UTF8
} catch {}

# Create a safe branch if we're on main (avoid committing autonomy state to main)
try {
  $b = GitBranch
  if ($b -eq "main") {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $newBranch = "autonomy/vscode-" + $stamp
    RunCmd ("git checkout -b " + $newBranch) | Out-Null
    Log ("Checked out branch: " + $newBranch)
  }
} catch {}

Log ("Started. IntervalSeconds=" + $IntervalSeconds + " Fast=" + $Fast.IsPresent)
Log ("Stop file: " + $stopPath)

while ($true) {
  try {
    # stop signal
    if (Test-Path $stopPath) {
      Log "Stop signal found. Exiting."
      Remove-Item $stopPath -Force -ErrorAction SilentlyContinue
      break
    }

    # heartbeat
    try { Set-Content -Path $lockPath -Value ("pid=" + $PID + " utc=" + (Get-Date).ToUniversalTime().ToString("s") + "Z") -Encoding UTF8 } catch {}

    $cmd = 'pwsh -NoProfile -ExecutionPolicy Bypass -File "tools/autonomy-core/runner.ps1"'
    if ($Fast) { $env:AUTONOMY_FAST = "1" }
    $code = RunCmd $cmd
    if ($code -ne 0) { Log ("runner exit code=" + $code) }

    Start-Sleep -Seconds $IntervalSeconds
  } catch {
    Log ("ERROR: " + $_.Exception.Message)
    Start-Sleep -Seconds ([Math]::Max(15, [int]($IntervalSeconds / 4)))
  }
}

Log "DONE"
