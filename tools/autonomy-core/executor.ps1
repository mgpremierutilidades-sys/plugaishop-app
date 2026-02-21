# PATH: tools/autonomy-core/executor.ps1
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

function Action-CartUxUpgradeV1() {
  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"

  $before = Get-Content $cartFile -Raw
  $after = $before

  # 1) Ensure feature-flag hook exists (non-visual by default: OFF)
  if ($after -notmatch 'const\s+cartUxUpgrade\s*=\s*isFlagEnabled\("ff_cart_ux_upgrade_v1"\)\s*;') {
    $after = [Regex]::Replace(
      $after,
      'const\s+uiV2\s*=\s*isFlagEnabled\("ff_cart_ui_v2"\)\s*;\s*',
      'const uiV2 = isFlagEnabled("ff_cart_ui_v2");' + "`n" + '  const cartUxUpgrade = isFlagEnabled("ff_cart_ux_upgrade_v1");' + "`n",
      1
    )
  }

  # 2) Fix duplicated "if (isFlagEnabled(...)) if (isFlagEnabled(...)) track(...)" occurrences
  #    This is a syntactic correctness pass to keep TS/ESLint happy.
  $dupPattern = 'if\s*\(\s*isFlagEnabled\("ff_cart_analytics_v1"\)\s*\)\s*\r?\n\s*if\s*\(\s*isFlagEnabled\("ff_cart_analytics_v1"\)\s*\)\s*track\('
  $after = [Regex]::Replace($after, $dupPattern, 'if (isFlagEnabled("ff_cart_analytics_v1")) track(')

  # 3) Ensure checkout_start tracking is guarded and present (kept minimal)
  if ($after -notmatch 'track\("checkout_start"') {
    # If missing entirely, we do not inject blindly here (avoid working in the dark).
    # cart.tsx already has cart_proceed_tap; checkout_start is injected in the file patch itself.
    $result.notes += "cart.tsx: checkout_start not injected by executor (handled in code patch)"
  }

  if ($after -ne $before) {
    Set-Content -Path $cartFile -Value $after -Encoding UTF8
    $result.notes += "cart.tsx: applied cart_ux_upgrade_v1 preparatory fixes (flag hook + analytics duplicate cleanup)"
    $result.did_change = $true
  } else {
    $result.notes += "cart.tsx: no changes needed for cart_ux_upgrade_v1"
  }
}

try {
  if ($task.payload -eq $null -or $task.payload.action -eq $null) {
    throw "Task missing payload.action"
  }

  $action = [string]$task.payload.action
  $result.notes += ("action=" + $action)

  switch ($action) {
    "validate_cart_analytics_contract" { Action-ValidateCartAnalyticsContract }
    "cart_ux_upgrade_v1" { Action-CartUxUpgradeV1 }
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