# scripts/ai/commit_green.ps1
# Commit gate: typecheck + lint + stage + commit + (optional) push
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\ai\commit_green.ps1 -Message "fix: ci green"
# Options:
#   -NoPush
#   -OnlyFiles "path1","path2"

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Message,

  [switch]$NoPush,

  [string[]]$OnlyFiles
)

$ErrorActionPreference = "Stop"

function Fail {
  param([string]$Msg)
  Write-Host ""
  Write-Host ("[FAIL] " + $Msg) -ForegroundColor Red
  exit 1
}

function Ok {
  param([string]$Msg)
  Write-Host ("[OK] " + $Msg) -ForegroundColor Green
}

function Info {
  param([string]$Msg)
  Write-Host ("[INFO] " + $Msg) -ForegroundColor Cyan
}

function Warn {
  param([string]$Msg)
  Write-Host ("[WARN] " + $Msg) -ForegroundColor Yellow
}

# Ensure we are inside a git repository
try {
  git rev-parse --is-inside-work-tree *> $null
} catch {
  Fail "Not inside a git repository."
}

Write-Host ""
Info "Plugaishop Commit Gate"
Write-Host ""

# Status
Warn "Working tree status:"
git status -sb

# Typecheck
Write-Host ""
Warn "Running: npm run typecheck"
npm run typecheck
Ok "typecheck ok"

# Lint
Write-Host ""
Warn "Running: npm run lint"
npm run lint
Ok "lint ok"

# Stage
Write-Host ""
if ($OnlyFiles -and $OnlyFiles.Count -gt 0) {
  Warn "Staging only selected files:"
  foreach ($f in $OnlyFiles) { Write-Host (" - " + $f) }
  git add -- $OnlyFiles
} else {
  Warn "Staging all changes (git add -A)"
  git add -A
}
Ok "staging ok"

# Verify staged changes exist
$staged = git diff --cached --name-only
if (-not $staged) {
  Fail "No staged changes to commit."
}

# Commit
Write-Host ""
Warn ("Committing: " + $Message)
git commit -m "$Message"
Ok "commit ok"

# Push (optional)
if (-not $NoPush) {
  Write-Host ""
  Warn "Pushing to origin..."
  git push
  Ok "push ok"
} else {
  Ok "push skipped (-NoPush)"
}

Write-Host ""
Ok "DONE"
