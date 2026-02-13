param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "Plugaishop-GH-Queue"

try {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Out-Null
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
  Write-Host ("Stopped & removed task: " + $taskName)
} catch {
  Write-Host ("Could not remove task (maybe not installed): " + $_.Exception.Message)
}
