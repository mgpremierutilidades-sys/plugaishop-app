@'
param(
  [string]$Branch = "feat/cart-ui-v2",
  [string]$PreferredBase = "",
  [switch]$NoPush,
  [switch]$NoPR,
  [switch]$ForceClean
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Ok($msg) { Write-Host $msg -ForegroundColor Green }
function Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Fail($msg) { throw $msg }

# repo root
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

Step "== Plugaishop AUTOPILOT: Cart UI V2 =="

# Helpers
function HasBranchRemote($name) {
  $out = git ls-remote --heads origin $name 2>$null
  return [bool]($out -and $out.Trim().Length -gt 0)
}
function HasBranchLocal($name) {
  git show-ref --verify --quiet ("refs/heads/" + $name)
  return ($LASTEXITCODE -eq 0)
}
function EnsureCleanOrClean() {
  $status = git status --porcelain
  if ($status -and $status.Trim().Length -gt 0) {
    if (-not $ForceClean) {
      Fail "Working tree suja. Rode com -ForceClean ou commit/stash antes."
    }
    Warn "[clean] ForceClean ligado -> limpando untracked e changes..."
    git reset --hard | Out-Null
    git clean -fd | Out-Null
  }
}

# 1) fetch
Step "[git] fetch origin"
git fetch origin --prune | Out-Null

# 2) decide base branch
$base = $PreferredBase
if ([string]::IsNullOrWhiteSpace($base)) {
  if (HasBranchRemote "develop") { $base = "develop" }
  elseif (HasBranchRemote "main") { $base = "main" }
  else { $base = "master" }
}
Step "[git] base = $base"

# 3) ensure clean (or clean)
# also remove known trash folder if exists
if (Test-Path "ile") {
  Warn "[clean] removing ile/"
  Remove-Item -Recurse -Force "ile"
}
EnsureCleanOrClean

# 4) checkout branch safely (prefer remote branch if exists)
if (HasBranchRemote $Branch) {
  Step "[git] checkout remote branch origin/$Branch"
  git checkout -B $Branch --track ("origin/" + $Branch) 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    git checkout $Branch | Out-Null
  }
  Step "[git] pull --rebase"
  git pull --rebase | Out-Null
} else {
  Step "[git] create branch from origin/$base -> $Branch"
  git checkout -B $Branch ("origin/" + $base) | Out-Null
}

Ok "[git] branch ready: $Branch"

# 5) Ensure template exists; if missing, generate it from current app/(tabs)/cart.tsx
$templateDir = Join-Path $repoRoot "scripts\ai\templates"
$templateFile = Join-Path $templateDir "cart.ui_v2.tsx"
$cartFile = Join-Path $repoRoot "app\(tabs)\cart.tsx"

if (!(Test-Path $templateDir)) { New-Item -ItemType Directory -Force -Path $templateDir | Out-Null }

if (!(Test-Path $templateFile)) {
  Step "[template] missing -> generating from current cart.tsx"
  if (!(Test-Path $cartFile)) { Fail "Cart file not found: app/(tabs)/cart.tsx" }
  Get-Content $cartFile -Raw | Set-Content -Path $templateFile -Encoding utf8
  Ok "[template] created scripts/ai/templates/cart.ui_v2.tsx"
} else {
  Ok "[template] found scripts/ai/templates/cart.ui_v2.tsx"
}

# 6) Apply template -> cart.tsx (idempotent)
Step "[apply] template -> app/(tabs)/cart.tsx"
$template = Get-Content $templateFile -Raw
$template | Set-Content -Path $cartFile -Encoding utf8

# 7) Quality gate
Step "[gate] npm run lint"
npm run lint

Step "[gate] npx tsc --noEmit"
npx tsc --noEmit

# 8) Commit if changed
$diff = git status --porcelain
if ($diff -and $diff.Trim().Length -gt 0) {
  Step "[git] commit changes"
  git add -A
  git commit -m "feat(cart): cart ui v2 behind ff_cart_ui_v2" | Out-Null
  Ok "[git] committed"
} else {
  Ok "[git] no changes to commit"
}

# 9) Push
if (-not $NoPush) {
  Step "[git] push"
  git push -u origin $Branch
  Ok "[git] pushed"
} else {
  Warn "[git] NoPush ligado -> skip push"
}

# 10) PR (requires gh)
if (-not $NoPR) {
  $hasGh = $false
  try { gh --version | Out-Null; $hasGh = $true } catch { $hasGh = $false }

  if ($hasGh) {
    Step "[gh] create PR (if not exists)"
    # create PR only if there isn't one already
    $existing = ""
    try { $existing = gh pr list --head $Branch --json number --jq ".[0].number" 2>$null } catch { $existing = "" }

    if ($existing -and $existing.Trim().Length -gt 0) {
      Ok "[gh] PR already exists: #$existing"
    } else {
      gh pr create `
        --base $base `
        --head $Branch `
        --title "PR #1 — Carrinho (UI/UX) — ff_cart_ui_v2" `
        --body "UI/UX do carrinho atrás de feature-flag ff_cart_ui_v2. Inclui header actions, cards superiores, lista com hierarquia melhor, sticky footer e empty state. Métricas sob ff_cart_analytics_v1." | Out-Null
      Ok "[gh] PR created"
    }
  } else {
    Warn "[gh] gh CLI não encontrado -> pulei criação automática do PR"
  }
} else {
  Warn "[gh] NoPR ligado -> skip PR"
}

Ok "== DONE =="
'@ | Set-Content -Path "scripts/ai/autopilot_cart_ui_v2.ps1" -Encoding utf8
