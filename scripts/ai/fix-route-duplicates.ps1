[CmdletBinding()]
param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[fix-routes] " + $m) }

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

# Pré-condições
if (!(Test-Path -LiteralPath "scripts/ai/autoflow_routes.py")) {
  throw "Missing: scripts/ai/autoflow_routes.py"
}

# Lista de arquivos legacy que causam duplicata
$legacyFiles = @(
  "app/(tabs)/orders.tsx",
  "app/checkout/payment.tsx",
  "app/checkout/review.tsx",
  "app/checkout/shipping.tsx",
  "app/checkout/success.tsx"
)

# Pasta de stash fora de app/ para o Expo Router não enxergar
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$stashDir = "scripts/ai/_stash_routes/$ts"
New-Item -ItemType Directory -Force -Path $stashDir | Out-Null

Say "Repo: $repoRoot"
Say "DryRun: $DryRun"
Say "Stash: $stashDir"

# Valida existência e faz move (git mv quando possível)
foreach ($p in $legacyFiles) {
  if (Test-Path -LiteralPath $p) {
    $safeName = ($p -replace "[/\\:]", "_")
    $dest = Join-Path $stashDir $safeName

    if ($DryRun) {
      Say "DRY-RUN: stash $p -> $dest"
    } else {
      Say "stash $p -> $dest"
      git mv $p $dest
    }
  } else {
    Say "skip (missing): $p"
  }
}

# Ajuste invisível: app/checkout/_layout.tsx para não referenciar telas removidas
$layoutPath = "app/checkout/_layout.tsx"
if (Test-Path -LiteralPath $layoutPath) {
  if ($DryRun) {
    Say "DRY-RUN: will rewrite $layoutPath (remove screens payment/review/shipping/success)"
  } else {
    Say "rewrite $layoutPath (keep only export-debug + pix)"
@'
import React from "react";
import { Stack } from "expo-router";

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* Mantido apenas o que realmente existe em app/checkout para evitar rotas órfãs */}
      <Stack.Screen name="export-debug" />
      <Stack.Screen name="pix" />
    </Stack>
  );
}
'@ | Set-Content -Encoding UTF8 $layoutPath
  }
} else {
  Say "skip (missing): $layoutPath"
}

# Recalcula routes-report para confirmar que zerou duplicatas
Say "Re-running routes detector..."
python .\scripts\ai\autoflow_routes.py

$routeReport = "scripts/ai/_out/routes-report.json"
if (Test-Path -LiteralPath $routeReport) {
  $json = Get-Content -LiteralPath $routeReport -Raw | ConvertFrom-Json
  $dupCount = ($json.duplicates.PSObject.Properties | Measure-Object).Count
  Say "duplicates now: $dupCount"
  if ($dupCount -gt 0) {
    Say "WARNING: duplicates still present. Check scripts/ai/_out/routes-report.json"
    exit 2
  }
} else {
  Say "WARNING: routes-report.json not found"
}

Say "OK"
