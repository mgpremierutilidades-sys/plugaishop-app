# scripts/ai/run-all.ps1
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

# Folders
New-Item -ItemType Directory -Force "handoff\logs"        | Out-Null
New-Item -ItemType Directory -Force "handoff\pids"        | Out-Null
New-Item -ItemType Directory -Force "handoff\state_bundles" | Out-Null
New-Item -ItemType Directory -Force "handoff\locks"       | Out-Null

function Resolve-Python {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }

  if (Test-Path "C:\Python314\python.exe") { return "C:\Python314\python.exe" }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py -and $py.Source) { return $py.Source }

  throw "Python not found. Install Python or ensure 'python' is in PATH."
}

$Python = Resolve-Python
Write-Host "Using Python: $Python"

# Always stop duplicates first (especially planner)
& (Join-Path $PSScriptRoot "stop-all.ps1") | Out-Null

# Find optional state exporter script automatically
$StateExporter = Get-ChildItem "scripts\ai" -Filter "*.py" -File |
  Where-Object { $_.Name -match "state" -and $_.Name -match "export" } |
  Select-Object -First 1 -ExpandProperty FullName

function Start-AIProc {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string[]]$Args,
    [Parameter(Mandatory=$true)][string]$OutLog,
    [Parameter(Mandatory=$true)][string]$ErrLog
  )

  $outPath = Join-Path $RepoRoot $OutLog
  $errPath = Join-Path $RepoRoot $ErrLog

  Write-Host "Starting $Name :: $($Args -join ' ')"
  $p = Start-Process -FilePath $Python `
    -ArgumentList $Args `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $outPath `
    -RedirectStandardError $errPath `
    -WindowStyle Minimized `
    -PassThru

  $pidFile = Join-Path $RepoRoot ("handoff\pids\{0}.pid" -f $Name)
  Set-Content -Path $pidFile -Value $p.Id -Encoding ASCII
}

# Core processes (expected)
Start-AIProc -Name "bundle_daemon" -Args @("scripts/ai/bundle_daemon.py") -OutLog "handoff\logs\bundle_daemon.out.log" -ErrLog "handoff\logs\bundle_daemon.err.log"
Start-AIProc -Name "planner"       -Args @("scripts/ai/planner_autonomo.py") -OutLog "handoff\logs\planner.out.log"       -ErrLog "handoff\logs\planner.err.log"
Start-AIProc -Name "agent_loop"    -Args @("scripts/ai/agent_loop.py","--loop") -OutLog "handoff\logs\agent_loop.out.log" -ErrLog "handoff\logs\agent_loop.err.log"

# Optional: state_exporter (start only if found)
if ($StateExporter) {
  # Convert full path back to repo-relative for Python call
  $rel = Resolve-Path $StateExporter | ForEach-Object {
    $_.Path.Substring($RepoRoot.Path.Length).TrimStart("\")
  }
  Start-AIProc -Name "state_exporter" -Args @($rel) -OutLog "handoff\logs\state_exporter.out.log" -ErrLog "handoff\logs\state_exporter.err.log"
} else {
  Write-Host "WARNING: No state exporter script found under scripts/ai matching *state*export*.py. (But latest.zip may still be produced by another mechanism.)"
}

Write-Host ""
Write-Host "Health check:"
& (Join-Path $PSScriptRoot "health-check.ps1")
