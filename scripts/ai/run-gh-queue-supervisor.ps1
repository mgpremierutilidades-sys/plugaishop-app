param(
  [string]$ProjectRoot = "E:\plugaishop-app",
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

$logDir = Join-Path $ProjectRoot "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$out = Join-Path $logDir "gh-queue-supervisor.out.log"
$err = Join-Path $logDir "gh-queue-supervisor.err.log"

"[$(Get-Date -Format s)] START supervisor | root=$ProjectRoot | loop=$LoopSeconds | fast=$Fast" | Add-Content $out

# lock
$lock = Join-Path $logDir "gh-queue-supervisor.lock"
try { $fs = [System.IO.File]::Open($lock,'OpenOrCreate','ReadWrite','None') }
catch { "[$(Get-Date -Format s)] LOCKED: outra instância." | Add-Content $err; exit 2 }

while ($true) {
  try {
    "[$(Get-Date -Format s)] AUTOHEAL begin" | Add-Content $out
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "scripts\ai\fix-gh-queue-autoheal.ps1") `
      -ProjectRoot $ProjectRoot 1>>$out 2>>$err

    "[$(Get-Date -Format s)] PATCH worker final" | Add-Content $out
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "scripts\ai\patch-worker-final.ps1") `
      -ProjectRoot $ProjectRoot 1>>$out 2>>$err

    "[$(Get-Date -Format s)] WORKER start" | Add-Content $out
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "scripts\ai\github-queue-worker.ps1") `
      -ProjectRoot $ProjectRoot -LoopSeconds $LoopSeconds -Fast:$Fast 1>>$out 2>>$err
  } catch {
    "[$(Get-Date -Format s)] SUPERVISOR crash: $($_.Exception.Message)" | Add-Content $err
  }
  Start-Sleep 5
}
