[CmdletBinding()]
param(
  [ValidateSet("verify","fix")]
  [string]$Mode = "fix",

  [int]$MaxFixPasses = 2,
  [switch]$AutoPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[fixer] " + $m) }

$Repo = "C:\plugaishop-app"
if (!(Test-Path -LiteralPath $Repo)) { throw "Missing repo path: $Repo" }
Set-Location $Repo

$OutDir = Join-Path $Repo "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Log = Join-Path $OutDir "fixer.log"

function Backup-File([string]$path) {
  if (!(Test-Path -LiteralPath $path)) { return }
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupDir = Join-Path $Repo "scripts\ai\_backup"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $safe = ($path -replace "[/\\:]", "_")
  $dest = Join-Path $backupDir ("{0}.{1}.bak" -f $safe, $ts)
  Copy-Item -LiteralPath $path -Destination $dest -Force
}

function Run([string]$title, [scriptblock]$cmd) {
  Add-Content -Encoding UTF8 -LiteralPath $Log -Value "`n===== $title @ $(Get-Date -Format o) ====="
  & $cmd 2>&1 | Tee-Object -FilePath $Log -Append | Out-Null
  return $LASTEXITCODE
}

function Git-PushSafe {
  # Push resiliente:
  # - não falha por "Everything up-to-date"
  # - falha apenas por exit code != 0
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $out = & git push 2>&1
    $code = $LASTEXITCODE

    Add-Content -Encoding UTF8 -LiteralPath $Log -Value ("[fixer] git push exitcode=" + $code)
    if ($out) { Add-Content -Encoding UTF8 -LiteralPath $Log -Value $out }

    if ($code -ne 0) { return $code }
    return 0
  }
  finally {
    $ErrorActionPreference = $prevEap
  }
}

Say "repo: $Repo"
Add-Content -Encoding UTF8 -LiteralPath $Log -Value "`n===== FIXER START @ $(Get-Date -Format o) ====="
Add-Content -Encoding UTF8 -LiteralPath $Log -Value ("mode=" + $Mode + " maxFixPasses=" + $MaxFixPasses + " autoPush=" + [bool]$AutoPush)

# 1) Snapshot de arquivos possivelmente alterados
$touch = @(
  "app/_layout.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/explore.tsx",
  "components/global-chrome.tsx",
  "components/ui/collapsible.tsx",
  "tsconfig.json",
  ".vscode/tasks.json",
  ".vscode/settings.json",
  ".vscode/launch.json"
)
foreach ($p in $touch) { Backup-File $p }

# 2) Passes de fix (lint) + verify (tsc)
for ($i=1; $i -le $MaxFixPasses; $i++) {
  Say "pass $i/$MaxFixPasses"

  $codeLint = Run "lint" { npm -s run lint }
  if ($codeLint -ne 0) { Say "lint exitcode=$codeLint (stop)"; exit $codeLint }

  $codeTsc = Run "typecheck" { npx tsc -p tsconfig.json --noEmit }
  if ($codeTsc -eq 0) { break }

  # sem “chute”: se tsc falhar, paramos com exit code claro
  Say "tsc exitcode=$codeTsc (manual fix needed or targeted codemods)"
  exit $codeTsc
}

# 3) Commit/push se houver mudanças
$st = (git status --porcelain)
if ($st) {
  Say "changes detected -> commit"
  git add -- app components tsconfig.json .vscode scripts/ai/_backup | Out-Null
  git commit -m "chore(autoflow): auto-fix problems (lint/verify)" | Out-Null

  if ($AutoPush) {
    Say "push..."
    $pushCode = Git-PushSafe
    if ($pushCode -ne 0) { exit $pushCode }
  }

  Say "committed"
} else {
  Say "no changes"
}

Say "OK"
Add-Content -Encoding UTF8 -LiteralPath $Log -Value ("===== FIXER END @ " + (Get-Date -Format o) + " =====")
exit 0
