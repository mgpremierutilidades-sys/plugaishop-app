param(
  [string]$Branch = "feat/cart-ui-v2",
  [string]$PreferredBase = "main",
  [switch]$NoPush,
  [switch]$NoPR
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Fail($msg) { throw $msg }

if ([string]::IsNullOrWhiteSpace($Branch)) { Fail "Branch vazia. Informe -Branch." }

# repo root
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot
if (!(Test-Path ".git")) { Fail "Execute na RAIZ do repositório (onde existe .git)" }

Write-Step "== Plugaishop AUTOPILOT: Cart UI V2 =="

# ---- helpers
function RemoteHasBranch([string]$b) {
  $out = (git ls-remote --heads origin $b) 2>$null
  return -not [string]::IsNullOrWhiteSpace($out)
}

# Ignora untracked “conhecidos” (não podem bloquear automação)
$IgnoredUntrackedPrefixes = @(
  "?? ile/",
  "?? scripts/ai/autopilot_cart_ui_v2.ps1"
)

function Get-FilteredStatus {
  $lines = @(git status --porcelain)
  if (!$lines) { return @() }

  $filtered = @()
  foreach ($l in $lines) {
    $skip = $false
    foreach ($p in $IgnoredUntrackedPrefixes) {
      if ($l.StartsWith($p)) { $skip = $true; break }
    }
    if (-not $skip) { $filtered += $l }
  }
  return $filtered
}

# 0) fetch
Write-Step "[git] fetch origin"
git fetch origin --prune | Out-Host

# 1) resolve base
$base = $PreferredBase
if (-not (RemoteHasBranch $base)) {
  Warn "Remote branch '$base' nao existe. Tentando 'main'..."
  $base = "main"
  if (-not (RemoteHasBranch $base)) {
    Fail "Nao achei '$PreferredBase' nem 'main' no remote."
  }
}
Write-Step "[git] base = $base"

# 2) Se existir lixo untracked 'ile/', tenta limpar automatico
if (Test-Path "ile") {
  Warn "[clean] removendo pasta untracked ile/"
  try { Remove-Item -Recurse -Force "ile" -ErrorAction Stop } catch { }
}

# 3) working tree: só bloqueia se houver sujeira REAL (não os ignorados)
$dirty = Get-FilteredStatus
if ($dirty.Count -gt 0) {
  Write-Host ($dirty -join "`n")
  Fail "Working tree suja (fora da allowlist). Commit/stash antes de rodar o autopilot."
}

# 4) checkout branch diretamente a partir do remote base (sem mexer no base local)
Write-Step "[git] checkout branch from origin/$base -> $Branch"
# -B: cria OU reseta a branch para começar do origin/base
git checkout -B $Branch ("origin/" + $base) | Out-Host

# 5) paths
$flagsFile = "constants/flags.ts"
$cartFile  = "app/(tabs)/cart.tsx"
$template  = "scripts/ai/templates/cart.ui_v2.tsx"

if (!(Test-Path $template)) { Fail "Template nao encontrado: $template (crie e cole o cart.tsx V2 la dentro)" }
if (!(Test-Path $flagsFile)) { Fail "Arquivo nao encontrado: $flagsFile" }
if (!(Test-Path $cartFile))  { Fail "Arquivo nao encontrado: $cartFile" }

# 6) patch flags.ts (idempotente)
Write-Step "[patch] ensure ff_cart_ui_v2 in constants/flags.ts"
$flags = Get-Content $flagsFile -Raw -Encoding UTF8

if ($flags -notmatch '"ff_cart_ui_v2"') {
  $unionRx = [regex]'export\s+type\s+FeatureFlag\s*=\s*([\s\S]*?);'
  $m = $unionRx.Match($flags)
  if (!$m.Success) { Fail "Nao achei 'export type FeatureFlag = ...;' em constants/flags.ts" }

  $unionBody = $m.Groups[1].Value
  if ($unionBody -notmatch "`n\s*$") { $unionBody = $unionBody + "`n" }
  $unionBody = $unionBody + '  | "ff_cart_ui_v2"' + "`n"

  $flags = $unionRx.Replace($flags, "export type FeatureFlag =`n$unionBody;")
}

if ($flags -notmatch 'ff_cart_ui_v2\s*:') {
  $anchor = 'const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {'
  if ($flags.IndexOf($anchor) -lt 0) { Fail "Nao achei DEFAULT_FLAGS em constants/flags.ts" }

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
  Warn "Nada para commitar. Saindo."
  exit 0
}

git commit -m "feat(cart): cart ui v2 behind ff_cart_ui_v2" | Out-Host

# 10) push
if (!$NoPush) {
  Write-Step "[git] push"
  git push -u origin $Branch | Out-Host
} else {
  Warn "NoPush ativado (sem push)."
}

# 11) PR opcional
if (!$NoPR) {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    Write-Step "[gh] create PR"
    & gh pr create --base $base --head $Branch --title "PR #1 - Carrinho (UI/UX) - ff_cart_ui_v2" --body "UI/UX do carrinho atras de ff_cart_ui_v2. Sem alterar regras de negocio. Eventos novos condicionados a ff_cart_analytics_v1." | Out-Host
  } else {
    Warn "gh CLI nao encontrado. PR manual no GitHub (ok)."
  }
}

Write-Step "== DONE =="
Write-Host "Ative ff_cart_ui_v2 e teste a aba Carrinho. Desligue e confirme fallback." -ForegroundColor Green
