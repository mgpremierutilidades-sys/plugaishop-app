param(
  [string]$Branch = "feat/cart-ui-v2",
  [string]$BaseBranch = "develop",
  [switch]$NoPush,
  [switch]$NoPR
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Fail($msg) { throw $msg }

# 1) raiz do repo
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot
if (!(Test-Path ".git")) { Fail "Execute na RAIZ do repositório (onde existe .git)" }

Write-Step "== Plugaishop AUTOPILOT: Cart UI V2 =="

# 2) working tree limpa
$gitStatus = (git status --porcelain)
if ($gitStatus) {
  Write-Host $gitStatus
  Fail "Working tree suja. Commit/stash antes de rodar o autopilot."
}

# 3) checkout base + pull
Write-Step "[git] checkout $BaseBranch"
git checkout $BaseBranch | Out-Null
git pull | Out-Null

# 4) branch
Write-Step "[git] checkout/create $Branch"
git checkout -b $Branch 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { git checkout $Branch | Out-Null }

# 5) paths
$flagsFile = "constants/flags.ts"
$cartFile  = "app/(tabs)/cart.tsx"
$template  = "scripts/ai/templates/cart.ui_v2.tsx"

if (!(Test-Path $template)) { Fail "Template não encontrado: $template" }
if (!(Test-Path $flagsFile)) { Fail "Arquivo não encontrado: $flagsFile" }
if (!(Test-Path "app/(tabs)")) { Fail "Pasta app/(tabs) não encontrada." }

# 6) patch flags.ts (idempotente, sem regex frágil)
Write-Step "[patch] ensure ff_cart_ui_v2 in constants/flags.ts"
$flags = Get-Content $flagsFile -Raw -Encoding UTF8

# 6.1) inserir no union FeatureFlag
if ($flags -notmatch '"ff_cart_ui_v2"') {
  $unionRx = [regex]'export\s+type\s+FeatureFlag\s*=\s*([\s\S]*?);'
  $m = $unionRx.Match($flags)
  if (!$m.Success) { Fail "Não consegui localizar 'export type FeatureFlag = ...;' em constants/flags.ts" }

  $unionBody = $m.Groups[1].Value

  # garante que termina com newline
  if ($unionBody -notmatch "`n\s*$") { $unionBody = $unionBody + "`n" }

  $unionBody = $unionBody + '  | "ff_cart_ui_v2"' + "`n"

  $flags = $unionRx.Replace($flags, "export type FeatureFlag =`n$unionBody;")
}

# 6.2) inserir no DEFAULT_FLAGS
if ($flags -notmatch 'ff_cart_ui_v2\s*:') {
  $anchor = 'const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {'
  $idx = $flags.IndexOf($anchor)
  if ($idx -lt 0) { Fail "Não consegui localizar DEFAULT_FLAGS em constants/flags.ts" }

  $insert = @"
$anchor
  // PR #1 - Carrinho (UI/UX)
  ff_cart_ui_v2: false,
"@

  $flags = $flags.Replace($anchor, $insert)
}

Set-Content -Path $flagsFile -Value $flags -Encoding UTF8

# 7) aplica template do carrinho
Write-Step "[patch] apply cart template -> $cartFile"
$templateText = Get-Content $template -Raw -Encoding UTF8
Set-Content -Path $cartFile -Value $templateText -Encoding UTF8

# 8) gates
Write-Step "[gate] npm run lint"
npm run lint | Out-Host

Write-Step "[gate] npx tsc --noEmit"
npx tsc --noEmit | Out-Host

# 9) commit
Write-Step "[git] commit"
git add $flagsFile | Out-Null
git add "$cartFile" | Out-Null

$hasChanges = (git diff --cached --name-only)
if (!$hasChanges) {
  Write-Host "Nada para commitar. Saindo." -ForegroundColor Yellow
  exit 0
}

git commit -m "feat(cart): cart ui v2 behind ff_cart_ui_v2" | Out-Host

# 10) push
if (!$NoPush) {
  Write-Step "[git] push"
  git push -u origin $Branch | Out-Host
} else {
  Write-Host "NoPush ativado (sem push)." -ForegroundColor Yellow
}

# 11) PR (opcional) - sempre via & gh em 1 linha (PS-safe)
if (!$NoPR) {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    Write-Step "[gh] create PR"
    & gh pr create --base $BaseBranch --head $Branch --title "PR #1 - Carrinho (UI/UX) - ff_cart_ui_v2" --body "UI/UX do carrinho atras de feature-flag ff_cart_ui_v2. Sem alterar regras de negocio. Eventos novos condicionados a ff_cart_analytics_v1." | Out-Host
  } else {
    Write-Host "gh CLI não encontrado. PR manual no GitHub (ok)." -ForegroundColor Yellow
  }
}

Write-Step "== DONE =="
Write-Host "Ative ff_cart_ui_v2 e teste a aba Carrinho. Desligue e confirme fallback." -ForegroundColor Green
