param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "Plugaishop-GH-Queue"
$worker = Join-Path $ProjectRoot "scripts\ai\github-queue-worker.ps1"

if (-not (Test-Path $worker)) { throw "Missing worker: $worker" }

$pwsh = (Get-Command pwsh).Source
$args = '-NoProfile -ExecutionPolicy Bypass -File "' + $worker + '" -ProjectRoot "' + $ProjectRoot + '" -LoopSeconds ' + $LoopSeconds
if ($Fast) { $args += " -Fast" }

$action  = New-ScheduledTaskAction -Execute $pwsh -Argument $args
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest

# Replace if exists
try { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null } catch {}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host ""
Write-Host ("Installed & started task: " + $taskName)
Write-Host ("Worker: " + $worker)
Write-Host ("Args: " + $args)
