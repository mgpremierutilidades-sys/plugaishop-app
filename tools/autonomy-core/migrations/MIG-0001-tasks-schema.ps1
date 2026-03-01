[CmdletBinding(SupportsShouldProcess=$true)]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stateDir = Join-Path $PSScriptRoot "..\_state"
$tasksPath = Join-Path $stateDir "tasks.json"

if (-not (Test-Path $stateDir)) {
  if ($PSCmdlet.ShouldProcess($stateDir, "Create state directory")) {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
  }
}

if (-not (Test-Path $tasksPath)) {
  $seed = @()
  $json = ($seed | ConvertTo-Json -Depth 10)

  if ($PSCmdlet.ShouldProcess($tasksPath, "Create tasks.json schema file")) {
    Set-Content -Path $tasksPath -Value $json -Encoding UTF8
  }
}