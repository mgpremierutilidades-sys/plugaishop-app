# scripts/ai/_autoflow/task_entry.ps1
[CmdletBinding()]
param(
  [ValidateSet("full","verify","hygiene")]
  [string]$Mode = "verify",

  [bool]$AutoCommit = $true,
  [bool]$AutoPush = $true
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

# log fixo do scheduler
$logFile = "scripts/ai/_out/autoflow-task-hourly.log"

# chama runner real
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$repoRoot\scripts\ai\_autoflow\run.ps1" `
  -Mode $Mode `
  -AutoCommit:$AutoCommit `
  -AutoPush:$AutoPush `
  -LogFile $logFile

exit $LASTEXITCODE
