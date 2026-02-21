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
}

function Action-CartCrossSellV1() {
  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"

  $before = Get-Content $cartFile -Raw
  $after = $before

  # 1) Ensure ScrollView import in react-native import block
  # Looks for "SectionList," and injects "ScrollView,"
  if ($after -match 'from\s+"react-native";' -and $after -notmatch '\bScrollView\b') {
    $after = [Regex]::Replace(
      $after,
      '(\bSectionList,\s*)',
      '${1}  ScrollView,' + "`r`n  ",
      1
    )
  }

  # 2) Add flag const if missing
  if ($after -notmatch 'ff_cart_cross_sell_v1') {
    # Insert near other flags: after uiV2 or cartUxUpgrade if present
    if ($after -match 'const\s+uiV2\s*=\s*isFlagEnabled\("ff_cart_ui_v2"\)\s*;') {
      $after = [Regex]::Replace(
        $after,
        'const\s+uiV2\s*=\s*isFlagEnabled\("ff_cart_ui_v2"\)\s*;\s*',
        'const uiV2 = isFlagEnabled("ff_cart_ui_v2");' + "`r`n" + '  const crossSellV1 = isFlagEnabled("ff_cart_cross_sell_v1");' + "`r`n",
        1
      )
    }
  }

  # 3) Inject Recommendations component if missing
  if ($after -notmatch 'function\s+RecommendationsCrossSell') {

    $block = @'
function RecommendationsCrossSell({
  enabled,
  cartItemIds,
  onAdd,
}: {
  enabled: boolean;
  cartItemIds: string[];
  onAdd: (p: Product) => void;
}) {
  const recs = useMemo(() => {
    if (!enabled) return [] as Product[];
    const ids = new Set(cartItemIds.map(String));
    return (products as Product[])
      .filter((p) => !ids.has(String(p.id)))
      .slice(0, 4);
  }, [enabled, cartItemIds]);

  useEffect(() => {
    if (!enabled) return;
    if (recs.length === 0) return;
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_cross_sell_impression", { count: recs.length });
    }
  }, [enabled, recs.length]);

  if (!enabled || recs.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <ThemedText style={{ fontFamily: FONT_BODY_BOLD, fontSize: 14, marginBottom: 10 }}>
        Você também pode gostar
      </ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
        {recs.map((p) => (
          <Pressable
            key={String(p.id)}
            onPress={() => {
              if (isFlagEnabled("ff_cart_analytics_v1")) {
                track("cart_cross_sell_tap", { item_id: String(p.id) });
              }
              onAdd(p);
            }}
            style={({ pressed }) => [
              {
                width: 160,
                marginRight: 10,
                borderRadius: 16,
                padding: 12,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              },
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            <ProductThumb image={(p as any).image} size={64} />
            <ThemedText style={{ fontFamily: FONT_BODY_BOLD, fontSize: 12, marginTop: 10 }} numberOfLines={2}>
              {p.title}
            </ThemedText>
            <ThemedText style={{ fontFamily: FONT_BODY_BOLD, fontSize: 13, marginTop: 6 }}>
              {formatCurrency(p.price)}
            </ThemedText>
            <View style={{ marginTop: 10 }}>
              <ThemedText style={{ fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.primary }}>
                Adicionar
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
'@

    # Insert after ProgressBar() function
    $after = [Regex]::Replace(
      $after,
      '(function\s+ProgressBar\s*\([\s\S]*?\}\s*\r?\n)\r?\nexport\s+default\s+function\s+CartTab',
      '${1}' + "`r`n" + $block + "`r`n" + 'export default function CartTab',
      1
    )
  }

  # 4) Add footer injection: replace ListFooterComponent spacer with spacer + cross-sell
  # It’s safe and localized, doesn’t require full structural rewrite.
  if ($after -match 'ListFooterComponent=\{<View style=\{\{ height: 140 \}\} />\}' -and $after -notmatch 'RecommendationsCrossSell') {
    # If our injection failed earlier, don't proceed.
  } else {
    if ($after -match 'ListFooterComponent=\{<View style=\{\{ height: 140 \}\} />\}') {
      $after = [Regex]::Replace(
        $after,
        'ListFooterComponent=\{<View style=\{\{ height: 140 \}\} />\}',
        'ListFooterComponent={' + "`r`n" +
        '              <View>' + "`r`n" +
        '                <RecommendationsCrossSell' + "`r`n" +
        '                  enabled={crossSellV1}' + "`r`n" +
        '                  cartItemIds={localRows.map((r) => r.id)}' + "`r`n" +
        '                  onAdd={(p) => safeAdd(p)}' + "`r`n" +
        '                />' + "`r`n" +
        '                <View style={{ height: 140 }} />' + "`r`n" +
        '              </View>' + "`r`n" +
        '            }',
        1
      )
    }
  }

  if ($after -ne $before) {
    Set-Content -Path $cartFile -Value $after -Encoding UTF8
    $result.notes += "cart.tsx: injected cross-sell block behind ff_cart_cross_sell_v1"
    $result.did_change = $true
  } else {
    $result.notes += "cart.tsx: no changes needed for cart_cross_sell_v1 (already applied?)"
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
    "checkout_start_guardrails_v1" { Action-CheckoutStartGuardrailsV1 }
    "cart_cross_sell_v1" { Action-CartCrossSellV1 }
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