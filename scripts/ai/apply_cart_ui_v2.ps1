param(
  [string]$Branch = "feat/cart-ui-v2",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"

Write-Host "== AUTOPILOT: Cart UI V2 (write -> lint -> tsc -> commit -> push) ==" -ForegroundColor Cyan

if (!(Test-Path ".git")) { throw "Execute na raiz do repo (onde existe .git)" }

git checkout -b $Branch 2>$null
if ($LASTEXITCODE -ne 0) { git checkout $Branch }
Write-Host "Branch: $Branch" -ForegroundColor Green

$target = "app/(tabs)/cart.tsx"
New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null

# Você vai colar aqui o conteúdo EXATO do cart.tsx acima (mesmo conteúdo).
# Para evitar duplicação no chat: copie o bloco do cart.tsx e substitua nesta variável.
$cart = @'
<<< COLE AQUI O CONTEÚDO INTEGRAL DO cart.tsx QUE EU ENVIEI ACIMA >>>
'@

$cart = $cart -replace "`r`n", "`n"
Set-Content -Path $target -Value $cart -Encoding UTF8 -NoNewline
Write-Host "Wrote: $target" -ForegroundColor Green

npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint falhou. Abortando." }

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Typecheck falhou. Abortando." }

git add "$target"
git commit -m "feat(cart): cart ui v2 behind ff_cart_ui_v2" 2>$null

if (-not $NoPush) {
  git push -u origin $Branch
  Write-Host "Pushed to origin/$Branch" -ForegroundColor Green
} else {
  Write-Host "NoPush ativado." -ForegroundColor Yellow
}

Write-Host "== DONE ==" -ForegroundColor Cyan
