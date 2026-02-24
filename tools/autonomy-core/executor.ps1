# tools/autonomy-core/executor.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  # runner.ps1 passes JSON string (NOT file path)
  [Parameter(Mandatory=$true)][string]$TaskJson,
  [Parameter(Mandatory=$true)][string]$MetricsPath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

. (Join-Path $RepoRoot "tools/autonomy-core/lib.ps1")

function Read-FileRaw([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function New-DirIfMissing([string]$DirPath) {
  if (-not $DirPath) { return }
  if (-not (Test-Path $DirPath)) { New-Item -ItemType Directory -Path $DirPath | Out-Null }
}

function Write-FileIfChanged([string]$Path, [string]$Content) {
  $existing = Read-FileRaw $Path
  if ($existing -eq $Content) { return $false }
  $dir = Split-Path $Path -Parent
  New-DirIfMissing $dir
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::UTF8)
  return $true
}

function Get-AppTabsCheckoutPath([string]$FileName) {
  $p = Join-Path $RepoRoot "app"
  $p = Join-Path $p "(tabs)"
  $p = Join-Path $p "checkout"
  return (Join-Path $p $FileName)
}

function Get-AppCheckoutPath([string]$FileName) {
  $p = Join-Path $RepoRoot "app"
  $p = Join-Path $p "checkout"
  return (Join-Path $p $FileName)
}

# -------- result contract --------
$result = [ordered]@{
  ok = $false
  did_change = $false
  notes = @()
  errors = @()
  action = $null
  task_id = $null
}

# -------- parse task json string --------
$task = $null
try {
  $task = $TaskJson | ConvertFrom-Json
} catch {
  $result.ok = $false
  $result.errors += ("TaskJson parse failed: " + $_.Exception.Message)
  $result.notes += "executor: bad TaskJson"
  $result | ConvertTo-Json -Depth 50
  exit 0
}

$action = $task.payload.action
$result.action = $action
$result.task_id = $task.id

# -----------------------------
# Generators
# -----------------------------
function New-CheckoutPaymentTsx() {
  # IMPORTANT: use single-quoted here-string to prevent PowerShell from expanding ${...} in JS template strings
  return @'
// app/(tabs)/checkout/payment.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import theme from "../../../constants/theme";
import type { OrderDraft } from "../../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";

function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toFixed(2)}`.replace(".", ",");
}

export default function Payment() {
  const [order, setOrder] = useState<OrderDraft | null>(null);
  const subtotal = useMemo(() => Number(order?.subtotal ?? 0), [order]);
  const shippingPrice = useMemo(() => Number(order?.shipping?.price ?? 0), [order]);
  const total = useMemo(() => subtotal + shippingPrice, [subtotal, shippingPrice]);

  useEffect(() => {
    loadOrderDraft().then((o) => setOrder(o));
  }, []);

  async function handleContinue() {
    if (!order) return;
    await saveOrderDraft({
      ...order,
      payment: { method: "pix", status: "pending" },
    });
    router.push("/checkout/review" as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.colors.text }}>
          Pagamento
        </Text>

        <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Resumo</Text>
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>
            Subtotal: {formatBRL(subtotal)}
          </Text>
          <Text style={{ marginTop: 4, color: theme.colors.muted }}>
            Frete: {formatBRL(shippingPrice)}
          </Text>
          <Text style={{ marginTop: 8, color: theme.colors.text, fontWeight: "700" }}>
            Total: {formatBRL(total)}
          </Text>
        </View>

        <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Método</Text>
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>
            Pix (mock)
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          style={{
            marginTop: 24,
            backgroundColor: theme.colors.primary,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Continuar</Text>
        </Pressable>
      </View>
    </View>
  );
}
'@
}

# -----------------------------
# Tasks
# -----------------------------
function Invoke-CheckoutPaymentV1([bool]$CreateIfMissing) {
  $file = Get-AppTabsCheckoutPath "payment.tsx"
  if (-not $CreateIfMissing -and (-not (Test-Path $file))) {
    $result.notes += "checkout/payment.tsx: missing; skip (no create in this action context)"
    return
  }

  $content = New-CheckoutPaymentTsx
  $changed = Write-FileIfChanged -Path $file -Content $content
  if ($changed) {
    $result.notes += "checkout/payment.tsx: updated"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/payment.tsx: already ok (no-op)"
  }
}

function Invoke-FixCheckoutReviewDiscountV1() {
  $targets = @(
    @{ name="tabs";   path=(Get-AppTabsCheckoutPath "review.tsx"); storageImport='from "../../../utils/orderStorage"'; patchImport='from "../../../utils/orderDraftPatch"'; },
    @{ name="legacy"; path=(Get-AppCheckoutPath "review.tsx");     storageImport='from "../../utils/orderStorage"';    patchImport='from "../../utils/orderDraftPatch"'; }
  )

  foreach ($t in $targets) {
    $file = $t.path
    $txt = Read-FileRaw $file
    if (-not $txt) { $result.notes += ("APP-101: missing " + $t.name + " review: " + $file); continue }

    if ($txt -match "patchOrderDraft\(" -and $txt -match "saveOrderDraft\(") {
      $result.notes += ("APP-101: " + $t.name + " already uses patchOrderDraft (no-op)")
      continue
    }

    if ($txt -notmatch "patchOrderDraft") {
      if ($txt -match [regex]::Escape($t.storageImport)) {
        $txt = [regex]::Replace(
          $txt,
          "(import\s+\{\s*loadOrderDraft,\s*saveOrderDraft\s*\}\s+$([regex]::Escape($t.storageImport));)",
          '$1' + "`n" + 'import { patchOrderDraft } ' + $t.patchImport + ';',
          [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
      }
    }

    $pattern = "await\s+saveOrderDraft\(\s*\{\s*[\s\S]*?\}\s*\)\s*;?"
    if ($txt -match $pattern) {
      $txt = [regex]::Replace(
        $txt,
        $pattern,
        'await saveOrderDraft(patchOrderDraft(order, { discount, payment: order.payment ?? { method: "pix", status: "pending" } }) as any);',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
      )

      $changed = Write-FileIfChanged -Path $file -Content $txt
      if ($changed) { $result.did_change = $true; $result.notes += ("APP-101: patched " + $t.name) }
      else { $result.notes += ("APP-101: " + $t.name + " no-op") }
    } else {
      $result.notes += ("APP-101: " + $t.name + " did not match saveOrderDraft pattern; no-op (safe)")
    }
  }
}

function Invoke-FixCheckoutShippingPriceV1() {
  $targets = @(
    @{ name="tabs";   path=(Get-AppTabsCheckoutPath "review.tsx") },
    @{ name="legacy"; path=(Get-AppCheckoutPath "review.tsx") }
  )

  foreach ($t in $targets) {
    $file = $t.path
    $txt = Read-FileRaw $file
    if (-not $txt) { $result.notes += ("APP-102: missing " + $t.name + " review: " + $file); continue }

    $txt2 = $txt
    $txt2 = $txt2 -replace "Number\(order\?\.(shipping)\s*\?\?\s*0\)", "Number(order?.shipping?.price ?? 0)"
    $txt2 = $txt2 -replace "theme\.colors\.card", "theme.colors.surface"

    $changed = Write-FileIfChanged -Path $file -Content $txt2
    if ($changed) {
      $result.did_change = $true
      $result.notes += ("APP-102: patched " + $t.name + " review (shipping.price + surface)")
    } else {
      $result.notes += ("APP-102: " + $t.name + " already ok (no-op)")
    }
  }

  # prevent regression: only update payment.tsx if it already exists
  Invoke-CheckoutPaymentV1 $false
}

# -----------------------------
# Execute
# -----------------------------
try {
  switch ($action) {
    "checkout_payment_v1" { Invoke-CheckoutPaymentV1 $true }
    "fix_checkout_review_discount_v1" { Invoke-FixCheckoutReviewDiscountV1 }
    "fix_checkout_shipping_price_v1" { Invoke-FixCheckoutShippingPriceV1 }
    default { throw "Unknown action: $action" }
  }
  $result.ok = $true
} catch {
  $result.ok = $false
  $result.errors += $_.Exception.Message
  $result.notes += ("executor: exception thrown: " + $_.Exception.Message)
}

$result | ConvertTo-Json -Depth 50