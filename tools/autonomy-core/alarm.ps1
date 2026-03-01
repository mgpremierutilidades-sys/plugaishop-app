# tools/autonomy-core/alarm.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [string]$StateRelPath = "tools/autonomy-core/_state/state.json",
  [int]$ThresholdMinutes = 15,
  [string]$IssueTitle = "AUTONOMY DOWN",
  [string]$IssueLabel = "autonomy"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) { throw "GITHUB_TOKEN missing in environment." }
if (-not $env:GITHUB_REPOSITORY) { throw "GITHUB_REPOSITORY missing in environment." }

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$stateAbs = Join-Path $RepoRoot $StateRelPath
if (-not (Test-Path -LiteralPath $stateAbs)) { throw "state.json not found: $stateAbs" }

$state = Get-Content -LiteralPath $stateAbs -Raw -Encoding UTF8 | ConvertFrom-Json
$last = $state.last_run_utc

if (-not $last) {
  Write-Host "[alarm] last_run_utc missing -> opening issue"
  $isDown = $true
} else {
  $lastDt = [DateTime]::Parse($last).ToUniversalTime()
  $nowDt = (Get-Date).ToUniversalTime()
  $diffMin = [int]([TimeSpan]::FromTicks(($nowDt - $lastDt).Ticks).TotalMinutes)
  $isDown = ($diffMin -gt $ThresholdMinutes)
  Write-Host ("[alarm] last_run_utc=" + $last + " diffMin=" + $diffMin + " threshold=" + $ThresholdMinutes)
}

if (-not $isDown) { exit 0 }

$repo = $env:GITHUB_REPOSITORY
$apiBase = "https://api.github.com"
$headers = @{
  "Authorization" = "Bearer $($env:GITHUB_TOKEN)"
  "Accept"        = "application/vnd.github+json"
  "User-Agent"    = "autonomy-alarm"
}

# Check if issue already open
$issuesUrl = "$apiBase/repos/$repo/issues?state=open&per_page=100&labels=$IssueLabel"
$openIssues = Invoke-RestMethod -Method GET -Uri $issuesUrl -Headers $headers

foreach ($it in $openIssues) {
  if (($it.title + "") -eq $IssueTitle) {
    Write-Host "[alarm] Issue already open -> skip"
    exit 0
  }
}

$runUrl = ""
if ($env:GITHUB_RUN_ID) {
  $runUrl = "https://github.com/$repo/actions/runs/$($env:GITHUB_RUN_ID)"
}

$body = @"
Autonomy heartbeat missing.

- threshold_minutes: $ThresholdMinutes
- last_run_utc: $($state.last_run_utc)
- last_result: $($state.last_result)
- last_task_id: $($state.last_task_id)
- consecutive_failures: $($state.consecutive_failures)
- run: $runUrl
- trigger: $($env:AUTONOMY_TRIGGER)

Action:
- Check GitHub Actions schedule trigger
- Check tools/autonomy-core/_out logs
- Verify runner permissions (contents/issues)
"@

$createUrl = "$apiBase/repos/$repo/issues"
$payload = @{
  title  = $IssueTitle
  body   = $body
  labels = @($IssueLabel)
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method POST -Uri $createUrl -Headers $headers -Body $payload | Out-Null
Write-Host "[alarm] Issue created"