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
$EslintJson = Join-Path $OutDir "problems-eslint.json"
$TscTxt = Join-Path $OutDir "problems-tsc.txt"

function LogLine([string]$line) {
  Add-Content -Encoding UTF8 -LiteralPath $Log -Value $line
}

function Run([string]$title, [scriptblock]$cmd) {
  LogLine "`n===== $title @ $(Get-Date -Format o) ====="
  & $cmd 2>&1 | Tee-Object -FilePath $Log -Append | Out-Null
  return $LASTEXITCODE
}

function Git-PushSafe {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $out = & git push 2>&1
    $code = $LASTEXITCODE
    LogLine ("[fixer] git push exitcode=" + $code)
    if ($out) { LogLine $out }
    return $code
  }
  finally {
    $ErrorActionPreference = $prevEap
  }
}

Say "repo: $Repo"
LogLine "`n===== FIXER START @ $(Get-Date -Format o) ====="
LogLine ("mode=" + $Mode + " maxFixPasses=" + $MaxFixPasses + " autoPush=" + [bool]$AutoPush)

# Export “Problems” do VS Code de forma automatizada (sem depender de você)
try {
  # ESLint em JSON (não altera UI)
  & npx eslint . -f json 2>$null | Out-File -Encoding utf8 -FilePath $EslintJson
  LogLine "[fixer] wrote $EslintJson"
} catch {
  LogLine ("[fixer][WARN] eslint export failed: " + $_.Exception.Message)
}

try {
  # TypeScript em texto “sem pretty” (bom pra logs)
  & npx tsc -p tsconfig.json --noEmit --pretty false 2>&1 | Out-File -Encoding utf8 -FilePath $TscTxt
  LogLine "[fixer] wrote $TscTxt"
} catch {
  LogLine ("[fixer][WARN] tsc export failed: " + $_.Exception.Message)
}

# Passes de correção/validação
for ($i=1; $i -le $MaxFixPasses; $i++) {
  Say "pass $i/$MaxFixPasses"

  if ($Mode -eq "fix") {
    $codeLint = Run "lint (fix)" { npm -s run lint -- --fix }
  } else {
    $codeLint = Run "lint" { npm -s run lint }
  }
  if ($codeLint -ne 0) { Say "lint failed"; exit $codeLint }

  $codeTsc = Run "typecheck" { npx tsc -p tsconfig.json --noEmit }
  if ($codeTsc -eq 0) { break }

  Say "typecheck failed"
  exit $codeTsc
}

# Commit/push se houver mudanças
$st = (git status --porcelain)
if ($st) {
  Say "changes detected -> commit"
  git add -A | Out-Null
  git commit -m "chore(autoflow): auto-fix problems (lint/typecheck)" | Out-Null

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
LogLine ("===== FIXER END @ " + (Get-Date -Format o) + " =====")
exit 0
