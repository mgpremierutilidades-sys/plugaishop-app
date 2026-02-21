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

function Write-FileUtf8NoBom([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content.Replace("`r`n","`n").Replace("`n","`r`n"), $utf8NoBom)
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

  # Ensure feature-flag hook exists (non-visual by default: OFF)
  if ($after -notmatch 'const\s+cartUxUpgrade\s*=\s*isFlagEnabled\("ff_cart_ux_upgrade_v1"\)\s*;') {
    $after = [Regex]::Replace(
      $after,
      'const\s+uiV2\s*=\s*isFlagEnabled\("ff_cart_ui_v2"\)\s*;\s*',
      'const uiV2 = isFlagEnabled("ff_cart_ui_v2");' + "`n" + '  const cartUxUpgrade = isFlagEnabled("ff_cart_ux_upgrade_v1");' + "`n",
      1
    )
  }

  # Fix duplicated guard lines if any
  $dupPattern = 'if\s*\(\s*isFlagEnabled\("ff_cart_analytics_v1"\)\s*\)\s*\r?\n\s*if\s*\(\s*isFlagEnabled\("ff_cart_analytics_v1"\)\s*\)\s*track\('
  $after = [Regex]::Replace($after, $dupPattern, 'if (isFlagEnabled("ff_cart_analytics_v1")) track(')

  if ($after -ne $before) {
    Set-Content -Path $cartFile -Value $after -Encoding UTF8
    $result.notes += "cart.tsx: applied cart_ux_upgrade_v1 preparatory fixes"
    $result.did_change = $true
  } else {
    $result.notes += "cart.tsx: no changes needed for cart_ux_upgrade_v1"
  }
}

function Action-CheckoutStartGuardrailsV1() {
  $checkoutFile = Join-Path $RepoRoot "lib/checkout.ts"
  $cartFile     = Join-Path $RepoRoot "app/(tabs)/cart.tsx"

  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"

  $checkoutContent = @'
import { router } from "expo-router";
import { isFlagEnabled } from "../constants/flags";
import { track } from "./analytics";

export type CheckoutStartPayload = {
  source: "cart" | "pdp" | "home" | "unknown";
  subtotal?: number;
  items_count?: number;
};

export function startCheckout(payload: CheckoutStartPayload) {
  if (!isFlagEnabled("ff_checkout_start_guardrails_v1")) {
    try {
      router.push("/checkout" as any);
    } catch {
      try {
        router.push("/(tabs)/checkout" as any);
      } catch {}
    }
    return;
  }

  if (isFlagEnabled("ff_cart_analytics_v1")) {
    track("checkout_start", {
      source: payload.source ?? "unknown",
      subtotal: Number(payload.subtotal ?? 0),
      items_count: Number(payload.items_count ?? 0),
    });
  }

  try {
    router.push("/checkout" as any);
  } catch {
    try {
      router.push("/(tabs)/checkout" as any);
    } catch {}
  }
}
'@

  Write-FileUtf8NoBom -Path $checkoutFile -Content $checkoutContent
  $result.notes += "lib/checkout.ts: created/updated startCheckout() canonical entrypoint"
  $result.did_change = $true

  # cart.tsx must import and call startCheckout; easiest deterministic approach is to rely on code being updated by human paste.
  # But we still ensure the import exists if the file already contains 'handleProceed' with router.push.
  $cart = Get-Content $cartFile -Raw
  if ($cart -notmatch 'from\s+"../../lib/checkout"') {
    $cart2 = [Regex]::Replace(
      $cart,
      'import\s+\{\s*track\s*\}\s+from\s+"../../lib/analytics";\s*',
      'import { track } from "../../lib/analytics";' + "`r`n" + 'import { startCheckout } from "../../lib/checkout";' + "`r`n",
      1
    )
    if ($cart2 -ne $cart) {
      Set-Content -Path $cartFile -Value $cart2 -Encoding UTF8
      $result.notes += "cart.tsx: added startCheckout import"
      $result.did_change = $true
    }
  }

  $result.notes += "checkout_start_guardrails_v1: cart.tsx should call startCheckout (use provided full cart.tsx file)"
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
    "checkout_start_guardrails_v1" { Action-CheckoutStartGuardrailsV1 }
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