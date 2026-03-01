[CmdletBinding(SupportsShouldProcess=$true)]
param(
  [Parameter()][string]$MigrationsPath = (Join-Path $PSScriptRoot "migrations"),
  [Parameter()][switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  if (-not $Quiet) { Write-Output $Message }
}

if (-not (Test-Path $MigrationsPath)) {
  Write-Info "migrate: no migrations folder at: $MigrationsPath"
  exit 0
}

$files = Get-ChildItem -Path $MigrationsPath -Filter "MIG-*.ps1" -File |
  Sort-Object Name

if ($files.Count -eq 0) {
  Write-Info "migrate: no MIG-*.ps1 files found"
  exit 0
}

foreach ($f in $files) {
  $name = $f.Name
  if ($PSCmdlet.ShouldProcess($name, "Execute migration")) {
    Write-Info "migrate: running $name"
    & $f.FullName
  }
}

Write-Info "migrate: done"