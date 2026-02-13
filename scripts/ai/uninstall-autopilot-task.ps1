param(
  [string]$TaskName = "Plugaishop-Autopilot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null } catch {}
try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null } catch {}

Write-Host "Uninstalled: $TaskName"
