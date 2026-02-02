# scripts/ai/run-all.ps1
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

New-Item -ItemType Directory -Force "handoff\logs" | Out-Null
New-Item -ItemType Directory -Force "handoff\pids" | Out-Null
New-Item -ItemType Directory -Force "handoff\state_bundles" | Out-Null
New-Item -ItemType Directory -Force "handoff\locks" | Out-Null
New-Item -ItemType Directory -Force "handoff\requests" | Out-Null

function Resolve-Python {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  if (Test-Path "C:\Python314\python.exe") { return "C:\Python314\python.exe" }
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py -and $py.Source) { return $py.Source }
  throw "Python not found. Install Python or ensure 'python' is in PATH."
}

function Get-FileTail {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$Lines = 120
  )

  if (Test-Path $Path) {
    Write-Output (("---- tail {0}: {1} ----" -f $Lines, $Path))
    Get-Content $Path -Tail $Lines
    Write-Output "---- end tail ----"
  } else {
    Write-Output ("No log found at: {0}" -f $Path)
  }
}

function Start-AIProc {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string[]]$Args,
    [Parameter(Mandatory=$true)][string]$OutLog,
    [Parameter(Mandatory=$true)][string]$ErrLog
  )

  $outPath = Join-Path $RepoRoot $OutLog
  $errPath = Join-Path $RepoRoot $ErrLog

  New-Item -ItemType File -Force $outPath | Out-Null
  New-Item -ItemType File -Force $errPath | Out-Null

  Write-Output ("Starting {0} :: {1}" -f $Name, ($Args -join " "))
  $p = Start-Process -FilePath $Python `
    -ArgumentList $Args `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $outPath `
    -RedirectStandardError  $errPath `
    -WindowStyle Minimized `
    -PassThru

  Set-Content -Path (Join-Path $RepoRoot ("handoff\pids\{0}.pid" -f $Name)) -Value $p.Id -Encoding ASCII

  Start-Sleep -Milliseconds 900
  if (-not (Get-Process -Id $p.Id -ErrorAction SilentlyContinue)) {
    Write-Output ("ERROR: {0} exited immediately (PID {1})." -f $Name, $p.Id)
    Get-FileTail -Path $errPath -Lines 160
  }

  return $p
}

$Python = Resolve-Python
Write-Output ("Using Python: {0}" -f $Python)
Write-Output ("RepoRoot: {0}" -f $RepoRoot)

# Stop duplicates first
& (Join-Path $PSScriptRoot "stop-all.ps1") | Out-Null

# Optional bundle daemon
if (Test-Path (Join-Path $RepoRoot "scripts\ai\bundle_daemon.py")) {
  Start-AIProc -Name "bundle_daemon" -Args @("scripts/ai/bundle_daemon.py") -OutLog "handoff\logs\bundle_daemon.out.log" -ErrLog "handoff\logs\bundle_daemon.err.log" | Out-Null
} else {
  Write-Output "INFO: scripts/ai/bundle_daemon.py not found; skipping bundle_daemon."
}

# Core
Start-AIProc -Name "planner"    -Args @("scripts/ai/planner_autonomo.py")        -OutLog "handoff\logs\planner.out.log"     -ErrLog "handoff\logs\planner.err.log"     | Out-Null
Start-AIProc -Name "agent_loop" -Args @("scripts/ai/agent_loop.py","--loop")     -OutLog "handoff\logs\agent_loop.out.log" -ErrLog "handoff\logs\agent_loop.err.log" | Out-Null

# State exporter (prefer exact path if present)
if (Test-Path (Join-Path $RepoRoot "scripts\ai\state_exporter.py")) {
  Start-AIProc -Name "state_exporter" -Args @("scripts/ai/state_exporter.py") -OutLog "handoff\logs\state_exporter.out.log" -ErrLog "handoff\logs\state_exporter.err.log" | Out-Null
} else {
  # Fallback: find any *state*export*.py under scripts/ai
  $StateExporter = Get-ChildItem "scripts\ai" -Filter "*.py" -File |
    Where-Object { $_.Name -match "state" -and $_.Name -match "export" } |
    Select-Object -First 1 -ExpandProperty FullName

  if ($StateExporter) {
    $rel = (Resolve-Path $StateExporter).Path.Substring($RepoRoot.Path.Length).TrimStart("\")
    Start-AIProc -Name "state_exporter" -Args @($rel) -OutLog "handoff\logs\state_exporter.out.log" -ErrLog "handoff\logs\state_exporter.err.log" | Out-Null
  } else {
    Write-Output "WARNING: no state exporter script found under scripts/ai."
  }
}

Write-Output ""
Write-Output "Health check:"
& (Join-Path $PSScriptRoot "health-check.ps1")
