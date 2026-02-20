param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][hashtable]$RunSummary
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$path = Join-Path $OutDir ("report-" + $ts + ".md")

$lines = @()
$lines += "# Autonomy Report"
$lines += ""
$lines += "- **UTC:** " + (Get-Date).ToUniversalTime().ToString("s") + "Z"
$lines += "- **Result:** " + $RunSummary.result
$lines += "- **Branch:** " + $RunSummary.branch
$lines += "- **Last Task:** " + ($RunSummary.last_task_id ?? "none")
$lines += ""
$lines += "## Gates"
$lines += ""
$lines += "- Lint: " + $RunSummary.gates.lint
$lines += "- Typecheck: " + $RunSummary.gates.typecheck
$lines += ""
$lines += "## Notes"
$lines += ""
foreach ($n in $RunSummary.notes) { $lines += "- " + $n }

$lines -join "`n" | Out-File -FilePath $path -Encoding UTF8
Write-Host ("Report: " + $path)