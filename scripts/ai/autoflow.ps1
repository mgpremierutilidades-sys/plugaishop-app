[CmdletBinding()]
param(
  [ValidateSet("analyze","fix-routes","verify","full")]
  [string]$Mode = "full",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[autoflow] " + $m) }

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

Say "repo: $repoRoot"
Say "mode: $Mode"
Say "dryrun: $DryRun"

if ($Mode -in @("analyze","full")) {
  Say "run: scripts/ai/run_autoflow.ps1 -Mode dry-run"
  .\scripts\ai\run_autoflow.ps1 -Mode dry-run
}

if ($Mode -in @("fix-routes","full")) {
  Say "run: scripts/ai/fix-route-duplicates.ps1"
  .\scripts\ai\fix-route-duplicates.ps1 -DryRun:$DryRun
}

if ($Mode -in @("verify","full")) {
  Say "verify: lint + tsc (if scripts exist)"
  if (Test-Path -LiteralPath "package.json") {
    # Ajuste os scripts abaixo conforme seus scripts reais em package.json
    if (!$DryRun) {
      npm -s run lint
      npm -s run tsc
    } else {
      Say "DRY-RUN: would run npm run lint && npm run tsc"
    }
  }
}

Say "done"
