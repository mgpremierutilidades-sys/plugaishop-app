# scripts/ai/export-context.ps1
[CmdletBinding()]
param(
  [string]$OutFile = "scripts/ai/_out/context-bundle.txt",
  [switch]$IncludeTSCDiagnostics
)

$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[export] " + $m) }

# UTF-8 no console/arquivos
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

# Arquivos alvo
$files = @(
  "context/CartContext.tsx",
  "utils/cartPricing.ts",
  "utils/orderDraftBuilder.ts",
  "app/(tabs)/cart.tsx",
  "app/(tabs)/index.tsx",
  "app/checkout/review.tsx",
  "app/orders/[id]/review.tsx",
  "types/order.ts"
)

# Possíveis "ghost" paths
$maybeGhost = @(
  "app/(tabs)/checkout/review.tsx",
  "app/(tabs)/checkout/review.ts"
)

$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine("## plugaishop context bundle")
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
  $null = $sb.AppendLine("-----BEGIN TS-----")
  $content = Get-Content -LiteralPath $full -Raw
  $null = $sb.AppendLine($content)
  $null = $sb.AppendLine("-----END TS-----")
  $null = $sb.AppendLine("")
}

Say "Bundling files..."
foreach ($f in $files) { AppendFile $f }

Say "Checking ghost paths..."
foreach ($g in $maybeGhost) {
  $full = Join-Path $root $g
  if (Test-Path -LiteralPath $full) { AppendFile $g }
}

if ($IncludeTSCDiagnostics) {
  Say "Running tsc diagnostics..."
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
}

Set-Content -LiteralPath $outPath -Value $sb.ToString() -Encoding utf8
Say ("Wrote: " + $OutFile)