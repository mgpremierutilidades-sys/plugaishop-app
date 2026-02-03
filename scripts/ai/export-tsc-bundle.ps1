# scripts/ai/export-tsc-bundle.ps1
[CmdletBinding()]
param(
  [string]$OutFile = "scripts/ai/_out/tsc-bundle.txt"
)

$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[bundle] " + $m) }

# UTF-8 best-effort (não quebra se falhar)
try {
  chcp 65001 | Out-Null
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
} catch {}

$root = (Resolve-Path ".").Path
$outPath = Join-Path $root $OutFile
$outDir = Split-Path $outPath -Parent
New-Item -ItemType Directory -Force $outDir | Out-Null

# Lista baseada nos ERROS DO SEU TSC (os 15 arquivos)
$files = @(
  "app/(tabs)/index.tsx",
  "app/checkout/review.tsx",
  "hooks/useHomeScreenTelemetry.ts",
  "hooks/useOrdersAutoProgress.ts",
  "src/cart/useCartRows.ts",
  "types/order.ts",
  "types/orderPayload.ts",
  "utils/orderExport.ts",
  "utils/orderNotifier.ts",
  "utils/orderPayloadBuilder.ts",
  "utils/orderStatus.ts",
  "utils/orderTimelineAuto.ts",
  "utils/paymentBridge.ts",
  "utils/paymentMock.ts",
  "utils/shippingMock.ts",
  "utils/shippingService.ts",

  # Tipos/infra frequentemente necessários p/ esses erros
  "components/ParallaxScrollView.tsx",
  "utils/telemetry.ts",
  "utils/homeAnalytics.ts",
  "constants/featureFlags.ts",
  "tsconfig.json",
  "package.json"
)

# E scripts que estão te travando
$files += @(
  "scripts/ai/fix-all.ps1",
  "scripts/ai/fix-ghost-ts-review.ps1",
  "scripts/ai/fix-mojibake.py"
)

# Possíveis ghost paths que você citou antes
$maybeGhost = @(
  "app/(tabs)/checkout/review.tsx",
  "app/(tabs)/checkout/review.ts"
)

$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine("## plugaishop tsc bundle")
$null = $sb.AppendLine("repo: " + $root)
$null = $sb.AppendLine("generatedAt: " + (Get-Date -Format o))
$null = $sb.AppendLine("")

function AppendFile([string]$rel) {
  $full = Join-Path $root $rel

  $null = $sb.AppendLine("### FILE: " + $rel)

  if (-not (Test-Path -LiteralPath $full)) {
    $null = $sb.AppendLine("### STATUS: MISSING")
    $null = $sb.AppendLine("")
    return
  }

  $null = $sb.AppendLine("### STATUS: OK")
  $null = $sb.AppendLine("-----BEGIN-----")
  try {
    $content = Get-Content -LiteralPath $full -Raw
    $null = $sb.AppendLine($content)
  } catch {
    $null = $sb.AppendLine("<<READ ERROR>>")
    $null = $sb.AppendLine(($_ | Out-String))
  }
  $null = $sb.AppendLine("-----END-----")
  $null = $sb.AppendLine("")
}

Say "Bundling files..."
$files | Select-Object -Unique | ForEach-Object { AppendFile $_ }

Say "Checking ghost paths..."
foreach ($g in $maybeGhost) {
  $full = Join-Path $root $g
  if (Test-Path -LiteralPath $full) { AppendFile $g }
}

Say "Running tsc..."
$null = $sb.AppendLine("### TSC: START")
$null = $sb.AppendLine("-----BEGIN TSC-----")
try {
  $tscOut = (npx tsc -p . --noEmit 2>&1) | Out-String
  $null = $sb.AppendLine($tscOut)
} catch {
  $null = $sb.AppendLine(($_ | Out-String))
}
$null = $sb.AppendLine("-----END TSC-----")
$null = $sb.AppendLine("### TSC: END")
$null = $sb.AppendLine("")

Set-Content -LiteralPath $outPath -Value $sb.ToString() -Encoding utf8
Say ("Wrote: " + $OutFile)
