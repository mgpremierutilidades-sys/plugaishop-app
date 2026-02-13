param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 20,
  [switch]$Fast,
  [string]$TaskName = "Plugaishop-Autopilot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$auto = Join-Path $ProjectRoot "scripts\ai\autopilot.ps1"

if (!(Test-Path $auto)) { throw "autopilot.ps1 not found: $auto" }

# Prefer pwsh if available, else powershell
$pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue)
$exe = if ($pwsh) { $pwsh.Source } else { (Get-Command powershell).Source }

$args = @("-NoProfile","-ExecutionPolicy","Bypass","-File", "`"$auto`"","-ProjectRoot","`"$ProjectRoot`"","-LoopSeconds",$LoopSeconds)
if ($Fast) { $args += "-Fast" }

$action = New-ScheduledTaskAction -Execute $exe -Argument ($args -join " ")
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 3650) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Replace if exists
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Installed and started: $TaskName"
