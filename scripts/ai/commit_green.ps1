# scripts/ai/commit_green.ps1
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\ai\commit_green.ps1 -Message "chore: ci green"
# Optional:
#   -NoPush  (does not push)
#   -OnlyFiles "path1","path2" (stages only the provided files)

param(
  [Parameter(Mandatory=$true)]
  [string]$Message,

  [switch]$NoPush,

  [string[]]$OnlyFiles
)

$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host ""
  Write-Host "✖ $msg" -ForegroundColor Red
  exit 1
}

function Ok($msg) {
  Write-Host "✔ $msg" -ForegroundColor Green
}

try {
  # Ensure in git repo
  git rev-parse --is-inside-work-tree *> $null
} catch {
  Fail "Not inside a git repository."
}

Write-Host ""
Write-Host "== Plugaishop Commit Gate ==" -ForegroundColor Cyan

# 1) Typecheck
Write-Host ""
Write-Host "Running: npm run typecheck" -ForegroundColor Yellow
npm run typecheck
Ok "typecheck ok"

# 2) Lint
Write-Host ""
Write-Host "Running: npm run lint" -ForegroundColor Yellow
npm run lint
Ok "lint ok"

# 3) Stage
Write-Host ""
if ($OnlyFiles -and $OnlyFiles.Length -gt 0) {
  Write-Host "Staging only files:" -ForegroundColor Yellow
  $OnlyFiles | ForEach-Object { Write-Host " - $_" }
  git add -- $OnlyFiles
} else {
  Write-Host "Staging all changes (git add -A)" -ForegroundColor Yellow
  git add -A
}
Ok "staging ok"

# 4) Commit (only if there is something staged)
$staged = git diff --cached --name-only
if (-not $staged) {
  Fail "No staged changes to commit."
}

Write-Host ""
Write-Host "Committing: $Message" -ForegroundColor Yellow
git commit -m "$Message"
Ok "commit ok"

# 5) Push
if (-not $NoPush) {
  Write-Host ""
  Write-Host "Pushing to origin..." -ForegroundColor Yellow
  git push
  Ok "push ok"
} else {
  Ok "push skipped (-NoPush)"
}

Write-Host ""
Ok "DONE"
