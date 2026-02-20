param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][string]$RunSummaryPath
)

if (!(Test-Path $RunSummaryPath)) {
  throw "RunSummaryPath not found: $RunSummaryPath"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# PowerShell 7+: -AsHashtable
$run = Get-Content -LiteralPath $RunSummaryPath -Raw | ConvertFrom-Json -AsHashtable

$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$path = Join-Path $OutDir ("report-" + $ts + ".md")

$lines = @()
$lines += "# Autonomy Report"
$lines += ""
$lines += "- **UTC:** " + (Get-Date).ToUniversalTime().ToString("s") + "Z"
$lines += "- **Result:** " + ($run.result ?? "unknown")
$lines += "- **Branch:** " + ($run.branch ?? "unknown")
$lines += "- **Last Task:** " + ($run.last_task_id ?? "none")
$lines += ""
$lines += "## Gates"
$lines += ""
$lines += "- Lint: " + ($run.gates.lint ?? "unknown")
$lines += "- Typecheck: " + ($run.gates.typecheck ?? "unknown")
$lines += ""
$lines += "## Notes"
$lines += ""

if ($run.notes -and $run.notes.Count -gt 0) {
  foreach ($n in $run.notes) { $lines += "- " + $n }
} else {
  $lines += "- (none)"
}

$lines -join "`n" | Out-File -FilePath $path -Encoding UTF8 -Force
Write-Host ("Report: " + $path)