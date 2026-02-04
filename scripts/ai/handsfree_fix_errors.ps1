[CmdletBinding()]
param(
  [switch]$AutoCommit = $true,
  [switch]$AutoPush = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[handsfree-fix] " + $m) }

function BackupFile([string]$path) {
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupDir = "scripts/ai/_backup"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $safe = ($path -replace "[/\\:]", "_")
  $dest = Join-Path $backupDir ("{0}.{1}.bak" -f $safe, $ts)
  Copy-Item -LiteralPath $path -Destination $dest -Force
  Say "backup: $path -> $dest"
}

function PatchText([string]$path, [scriptblock]$mutator) {
  if (!(Test-Path -LiteralPath $path)) { throw "Missing file: $path" }
  BackupFile $path
  $txt = Get-Content -LiteralPath $path -Raw
  $new = & $mutator $txt
  if ($new -eq $txt) {
    Say "no changes: $path"
  } else {
    Set-Content -LiteralPath $path -Value $new -Encoding UTF8
    Say "patched: $path"
  }
}

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot
Say "repo: $repoRoot"

# 1) tsconfig.json: excluir stash + artefatos (zera errors do stash)
PatchText "tsconfig.json" {
  param($t)
  $t = $t -replace '"exclude"\s*:\s*\[\s*"node_modules"\s*\]',
    '"exclude": ["node_modules","scripts/ai/_stash_routes/**","scripts/ai/_out/**","context/**","tools/maxximus-orchestrator/data/**","dist-web/**","android/**",".expo/**"]'
  return $t
}

# 2) review.tsx: discount optional => coalesce
PatchText "app/(tabs)/checkout/review.tsx" {
  param($t)
  $t -replace 'order\.discount\.toFixed\(2\)', '(order.discount ?? 0).toFixed(2)'
}

# 3) pix.tsx: draft.id optional => coalesce
PatchText "app/checkout/pix.tsx" {
  param($t)
  $t -replace 'makePixCode\(draft\.id\)', 'makePixCode(draft.id ?? "draft")'
}

# 4) Gates
Say "typecheck..."
npx tsc -p tsconfig.json --noEmit

# 5) Commit/push automático (paths com parênteses precisam de -- + aspas)
if ($AutoCommit) {
  $st = (git status --porcelain)
  if ($st) {
    Say "git commit..."
    git add -- "tsconfig.json" "app/(tabs)/checkout/review.tsx" "app/checkout/pix.tsx" "scripts/ai/_backup" | Out-Null
    git commit -m "fix(autoflow): exclude stash from tsc + coalesce optional fields" | Out-Null
    Say "committed"
    if ($AutoPush) {
      Say "push..."
      git push
    }
  } else {
    Say "nothing to commit"
  }
}

Say "OK"
