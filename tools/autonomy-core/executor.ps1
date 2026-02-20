param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TaskJson,
  [Parameter(Mandatory=$true)][string]$MetricsPath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

. (Join-Path $RepoRoot "tools/autonomy-core/lib.ps1")

$task = $TaskJson | ConvertFrom-Json
$metrics = Read-Json $MetricsPath
if ($null -eq $metrics) { throw "Missing metrics.json at: $MetricsPath" }

$result = @{
  ok = $true
  did_change = $false
  committed_sha = $null
  notes = @()
}

# Autocommit config
$autocommitEnabled = $false
$authorName = $null
$authorEmail = $null
if ($metrics.autocommit -ne $null) {
  $autocommitEnabled = [bool]$metrics.autocommit.enabled
  $authorName = $metrics.autocommit.author_name
  $authorEmail = $metrics.autocommit.author_email
}

function Action-ValidateCartAnalyticsContract() {
  $flag = "ff_cart_analytics_v1"

  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  $ctxFile  = Join-Path $RepoRoot "context/CartContext.tsx"

  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"
  Ensure-File $ctxFile  "Missing cart context: context/CartContext.tsx"

  # Wrap track("cart_...") calls with flag
  $changedCart = Wrap-TrackCallsWithFlag -FilePath $cartFile -FlagName $flag -TrackPrefix "cart_"
  $changedCtx  = Wrap-TrackCallsWithFlag -FilePath $ctxFile  -FlagName $flag -TrackPrefix "cart_"

  if ($changedCart) {
    $result.notes += "cart.tsx: wrapped cart_ track() calls with isFlagEnabled($flag)"
    $result.did_change = $true
  }
  if ($changedCtx) {
    $result.notes += "CartContext.tsx: wrapped cart_ track() calls with isFlagEnabled($flag)"
    $result.did_change = $true
  }

  # Ensure imports if isFlagEnabled used
  $impCart = Ensure-IsFlagEnabledImport -FilePath $cartFile
  $impCtx  = Ensure-IsFlagEnabledImport -FilePath $ctxFile

  if ($impCart) { $result.notes += "cart.tsx: added isFlagEnabled import"; $result.did_change = $true }
  if ($impCtx)  { $result.notes += "CartContext.tsx: added isFlagEnabled import"; $result.did_change = $true }
}

try {
  if ($task.payload -eq $null -or $task.payload.action -eq $null) {
    throw "Task missing payload.action"
  }

  $action = [string]$task.payload.action
  $result.notes += ("action=" + $action)

  switch ($action) {
    "validate_cart_analytics_contract" { Action-ValidateCartAnalyticsContract }
    default { throw "Unknown action: $action" }
  }

  # Commit if enabled and there are changes
  if ($autocommitEnabled -and (Git-HasChanges)) {
    $msg = "autonomy(task): " + $task.id + " - " + $task.title
    $sha = Git-Commit -Message $msg -AuthorName $authorName -AuthorEmail $authorEmail
    $result.committed_sha = $sha
    $result.notes += ("committed_sha=" + $sha)
  } else {
    if (-not $autocommitEnabled) { $result.notes += "autocommit=disabled" }
    if (-not (Git-HasChanges)) { $result.notes += "no_git_changes" }
  }

} catch {
  $result.ok = $false
  $result.notes += ("executor_error=" + $_.Exception.Message)
}

$result | ConvertTo-Json -Depth 20