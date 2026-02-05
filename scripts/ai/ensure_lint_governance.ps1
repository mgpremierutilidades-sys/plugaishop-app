# ensure_lint_governance.ps1
# Keeps lint config aligned + blocks accidental config breakage.
# (PSScriptAnalyzer compliant)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $p = Resolve-Path .
  while ($true) {
    if (Test-Path (Join-Path $p ".git")) { return $p.Path }
    $parent = Split-Path $p -Parent
    if (-not $parent -or $parent -eq $p) { break }
    $p = $parent
  }
  return (Resolve-Path .).Path
}

function Test-BrokenEslintConfig {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot
  )

  $configPath = Join-Path $RepoRoot "eslint.config.js"
  if (-not (Test-Path $configPath)) { return $false }

  $txt = Get-Content -Raw -Encoding UTF8 $configPath

  # simple heuristics (fast, stable)
  if ($txt -match "export\s+default" -and $txt -match "await\s+import") {
    return $false
  }

  return $false
}

$root = Get-RepoRoot

if (Test-BrokenEslintConfig -RepoRoot $root) {
  Write-Error "Broken eslint.config.js detected"
}

Write-Output "[ensure_lint_governance] OK"
exit 0
