# scripts/ai/_autoflow/recreate_schtask.ps1
[CmdletBinding()]
param(
  [string]$TaskName = "Plugaishop-Autoflow-Verify-Hourly",
  [string]$Repo = "C:\plugaishop-app"
)

$ErrorActionPreference = "Stop"

# remove se existir
schtasks /Delete /F /TN $TaskName 2>$null | Out-Null

$entry = Join-Path $Repo "scripts\ai\_autoflow\task_entry.ps1"

# Importante: usar -AutoCommit:$true e -AutoPush:$true (bool)
$tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$entry`" -Mode verify -AutoCommit:`$true -AutoPush:`$true"

schtasks /Create /F `
  /TN $TaskName `
  /SC HOURLY /MO 1 `
  /TR $tr | Out-Null

Write-Host "OK: task criada/atualizada => $TaskName"
Write-Host "TR => $tr"
