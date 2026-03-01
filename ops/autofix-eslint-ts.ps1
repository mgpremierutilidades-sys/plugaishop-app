param(
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$CommitMessage = "chore: autofix eslint/ts",
  [switch]$NoCommit
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

function Run([string]$cmd) {
  Write-Host ("$ " + $cmd)
  $exe = $env:ComSpec
  $p = Start-Process -FilePath $exe -ArgumentList "/c", $cmd -WorkingDirectory $RepoRoot -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}

function HasGitChanges() {
  $out = git status --porcelain
  return ($out -and $out.Trim().Length -gt 0)
}

# 1) ESLint autofix (via expo lint)
$code = Run "npm run lint:fix"
if ($code -ne 0) { throw ("lint:fix failed with exit code " + $code) }

# 2) Typecheck (não tem autofix, mas garante que nada quebrou)
$code = Run "npm run typecheck"
if ($code -ne 0) { throw ("typecheck failed with exit code " + $code) }

# 3) Commit (se houver diff)
if (-not (HasGitChanges)) {
  Write-Host "No git changes. Nothing to commit."
  exit 0
}

if ($NoCommit) {
  Write-Host "Changes present. NoCommit enabled, skipping commit."
  exit 0
}

git add -A | Out-Null
git commit -m $CommitMessage | Out-Null

Write-Host "Committed: $CommitMessage"
git rev-parse HEAD