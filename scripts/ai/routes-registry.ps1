<#
Routes Registry Checker — Plugaishop

Objetivo:
- Listar rotas (arquivos) dentro de app/
- Detectar duplicidade crítica de checkout
- Validar shims legacy de checkout (router.replace para /(tabs)/checkout/*)
- Gerar relatório: scripts/ai/_out/routes-found.txt

Uso:
  pwsh ./scripts/ai/routes-registry.ps1
#>

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$StartPath)
  $dir = Get-Item -LiteralPath $StartPath
  if ($dir -isnot [System.IO.DirectoryInfo]) { $dir = $dir.Directory }

  while ($null -ne $dir) {
    if (Test-Path -LiteralPath (Join-Path $dir.FullName "package.json")) { return $dir.FullName }
    if (Test-Path -LiteralPath (Join-Path $dir.FullName ".git")) { return $dir.FullName }
    $dir = $dir.Parent
  }
  throw "RepoRoot não encontrado (package.json/.git)."
}

$repoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
Set-Location $repoRoot

$outDir = Join-Path $repoRoot "scripts/ai/_out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$reportPath = Join-Path $outDir "routes-found.txt"

function RelPath([string]$full) {
  return $full.Replace($repoRoot, ".").Replace("\", "/")
}

function ReadFile([string]$rel) {
  $full = Join-Path $repoRoot $rel
  if (!(Test-Path -LiteralPath $full)) { return "" }
  return Get-Content -LiteralPath $full -Raw
}

Write-Host "🔎 Varredura de rotas em: $repoRoot/app" -ForegroundColor Cyan

$appRoot = Join-Path $repoRoot "app"
if (!(Test-Path -LiteralPath $appRoot)) { throw "Pasta app/ não encontrada." }

$routes = Get-ChildItem -Recurse -File -Force -Path $appRoot |
  Where-Object { $_.Extension -in ".ts",".tsx" } |
  Where-Object { $_.FullName -notmatch "\\_layout\.tsx$" } |
  ForEach-Object { RelPath $_.FullName } |
  Sort-Object

# Detect checkout duplicates (expected AFTER shims):
# Both trees exist, but legacy must be SHIM only.
$legacy = @(
  "app/checkout/index.tsx",
  "app/checkout/address.tsx",
  "app/checkout/shipping.tsx",
  "app/checkout/payment.tsx",
  "app/checkout/review.tsx",
  "app/checkout/success.tsx",
  "app/checkout/pix.tsx"
)

$tabs = @(
  "app/(tabs)/checkout/index.tsx",
  "app/(tabs)/checkout/address.tsx",
  "app/(tabs)/checkout/shipping.tsx",
  "app/(tabs)/checkout/payment.tsx",
  "app/(tabs)/checkout/review.tsx",
  "app/(tabs)/checkout/success.tsx"
)

$missing = @()
foreach ($r in $tabs) { if (!(Test-Path -LiteralPath (Join-Path $repoRoot $r))) { $missing += $r } }

$issues = @()

if ($missing.Count -gt 0) {
  $issues += "Faltando rota canônica de checkout (tabs):"
  foreach ($m in $missing) { $issues += "- $m" }
}

# Validate legacy shims contain expected replace targets
$expect = @{
  "app/checkout/index.tsx"   = 'router.replace("/(tabs)/checkout"'
  "app/checkout/address.tsx" = 'router.replace("/(tabs)/checkout/address"'
  "app/checkout/shipping.tsx"= 'router.replace("/(tabs)/checkout/shipping"'
  "app/checkout/payment.tsx" = 'router.replace("/(tabs)/checkout/payment"'
  "app/checkout/review.tsx"  = 'router.replace("/(tabs)/checkout/review"'
  "app/checkout/success.tsx" = 'router.replace("/(tabs)/checkout/success"'
  "app/checkout/pix.tsx"     = 'router.replace("/(tabs)/checkout/payment"'
}

foreach ($k in $expect.Keys) {
  $full = Join-Path $repoRoot $k
  if (!(Test-Path -LiteralPath $full)) {
    $issues += "Arquivo legacy checkout não encontrado: $k"
    continue
  }
  $txt = Get-Content -LiteralPath $full -Raw
  if ($txt -notlike "*$($expect[$k])*") {
    $issues += "Shim inválido em $k (esperado conter: $($expect[$k]))"
  }
}

# Emit report
$lines = @()
$lines += "# Routes found (app/)"
$lines += "Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
$lines += ""
$lines += "## Total: $($routes.Count)"
$lines += ""
foreach ($r in $routes) { $lines += "- $r" }
$lines += ""
$lines += "## Checkout canonical (tabs)"
foreach ($t in $tabs) { $lines += "- $t" }
$lines += ""
$lines += "## Checkout legacy (must be shims)"
foreach ($l in $legacy) { $lines += "- $l" }
$lines += ""
$lines += "## Issues: $($issues.Count)"
foreach ($i in $issues) { $lines += "- $i" }

Set-Content -LiteralPath $reportPath -Value ($lines -join "`n") -Encoding UTF8

if ($issues.Count -gt 0) {
  Write-Host "⚠️ ROUTES REGISTRY: encontrado drift ($($issues.Count))." -ForegroundColor Yellow
  Write-Host "Relatório: $reportPath" -ForegroundColor Yellow
  exit 2
}

Write-Host "✅ ROUTES REGISTRY OK." -ForegroundColor Green
Write-Host "Relatório: $reportPath" -ForegroundColor White