param([string]$ProjectRoot,[int]$LoopSeconds=30,[switch]$Fast)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $ProjectRoot
$logDir = Join-Path $ProjectRoot "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$out = Join-Path $logDir "gh-queue-task.out.log"
$err = Join-Path $logDir "gh-queue-task.err.log"
& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "scripts\ai\github-queue-worker.ps1") 
  -ProjectRoot $ProjectRoot -LoopSeconds $LoopSeconds -Fast:$Fast 1>>$out 2>>$err
