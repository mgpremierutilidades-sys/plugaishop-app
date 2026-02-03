param()

$ErrorActionPreference = "Stop"

# raiz do repo (robusto)
$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

Write-Host "== AUTOFLOW STEP2: ROUTE COLLISIONS =="

New-Item -ItemType Directory -Force -Path .\context | Out-Null
$outDump = "context/route_collision_files_dump.txt"
Remove-Item $outDump -ErrorAction SilentlyContinue

$files = @(
  "app/_layout.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/orders.tsx",

  "app/orders/_layout.tsx",
  "app/orders/index.tsx",

  "app/(tabs)/checkout/_layout.tsx",
  "app/(tabs)/checkout/index.tsx",
  "app/(tabs)/checkout/shipping.tsx",
  "app/(tabs)/checkout/payment.tsx",
  "app/(tabs)/checkout/review.tsx",
  "app/(tabs)/checkout/success.tsx",

  "app/checkout/_layout.tsx",
  "app/checkout/payment.tsx",
  "app/checkout/review.tsx",
  "app/checkout/shipping.tsx",
  "app/checkout/success.tsx",
  "app/checkout/pix.tsx",
  "app/checkout/export-debug.tsx"
)

foreach ($f in $files) {
  if (Test-Path -LiteralPath $f) {
    Add-Content -LiteralPath $outDump "===== PATH: $f ====="
    Get-Content -LiteralPath $f -Raw | Add-Content -LiteralPath $outDump
    Add-Content -LiteralPath $outDump "`n"
  } else {
    Add-Content -LiteralPath $outDump "===== MISSING: $f =====`n"
  }
}

Write-Host "Dump gerado: $outDump"

# roda o detector de rotas, se existir
if (Test-Path -LiteralPath "scripts/ai/autoflow_routes.py") {
  python .\scripts\ai\autoflow_routes.py
  if (Test-Path -LiteralPath "scripts/ai/_out/routes-report.json") {
    Write-Host "Routes report: scripts/ai/_out/routes-report.json"
  } else {
    Write-Host "WARNING: routes-report.json não foi gerado."
  }
} else {
  Write-Host "WARNING: scripts/ai/autoflow_routes.py não encontrado; pulando report."
}

Write-Host "== STEP2 OK =="
