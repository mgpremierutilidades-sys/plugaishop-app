param(
  [string]$Branch = "feat/cart-ui-v2",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"

Write-Host "== Plugaishop Autopilot: Cart UI V2 (HARD GATE) ==" -ForegroundColor Cyan
if (!(Test-Path ".git")) { throw "Execute na RAIZ do repositório (onde existe .git)" }

# Branch
git checkout -b $Branch 2>$null
if ($LASTEXITCODE -ne 0) { git checkout $Branch }
Write-Host "Branch: $Branch" -ForegroundColor Green

# Export context (se existir)
if (Test-Path "scripts/ai/export-context.ps1") {
  powershell -ExecutionPolicy Bypass -File "scripts/ai/export-context.ps1"
}

# Executor com alvo (não vaza para types/**)
powershell -ExecutionPolicy Bypass -File "scripts/ai/run_ai_patch.ps1" `
  -Objective "PR #1 — Carrinho (UI/UX) — ff_cart_ui_v2" `
  -TargetFile "app/(tabs)/cart.tsx"

# Quality gate HARD
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint falhou. Abortando sem commit/push." }

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Typecheck falhou. Abortando sem commit/push." }

# Commit só do alvo (evita sujeira)
git add "app/(tabs)/cart.tsx"
git commit -m "feat(cart): cart ui v2 behind ff_cart_ui_v2" 2>$null

if (-not $NoPush) {
  git push -u origin $Branch
  Write-Host "Pushed to origin/$Branch" -ForegroundColor Green
} else {
  Write-Host "NoPush ativado." -ForegroundColor Yellow
}

Write-Host "== DONE ==" -ForegroundColor Cyan
