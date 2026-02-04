[CmdletBinding()]
param(
  [ValidateSet("full","verify","hygiene")]
  [string]$Mode = "full",

  # schtasks/cmd passa tudo como string -> parse manual
  [string]$AutoCommit = "1",
  [string]$AutoPush = "1"
)

. "$PSScriptRoot\lib.ps1"

function To-Bool([string]$v, [bool]$default = $true) {
  if ($null -eq $v) { return $default }
  $s = $v.Trim().ToLowerInvariant()
  if ($s -in @("1","true","t","yes","y","on")) { return $true }
  if ($s -in @("0","false","f","no","n","off")) { return $false }
  if ($s -eq "") { return $default }
  return $true
}

$AutoCommitB = To-Bool $AutoCommit $true
$AutoPushB   = To-Bool $AutoPush $true

$repo = Ensure-RepoRoot
Say "repo: $repo"
Say "mode: $Mode"
Say "autocommit: $AutoCommitB"
Say "autopush: $AutoPushB"

if ($Mode -in @("hygiene","full")) {
  Append-GitIgnoreLines @(
    "node_modules/",
    ".expo/",
    "android/",
    "ios/",
    "dist/",
    "dist-web/",
    "_share/",
    "_tmp_support_bundle/",
    "context/",
    "scripts/ai/_out/",
    "scripts/ai/_stash_routes/",
    "tools/**/node_modules/",
    "tools/**/data/reports/",
    "tools/**/data/state.json",
    "tools/**/data/tasks.json",
    "tools/**/data/metrics.json"
  )
}

if ($Mode -in @("verify","full")) {
  Say "routes gate..."
  python .\scripts\ai\autoflow_routes.py | Out-Null

  $routeReport = "scripts/ai/_out/routes-report.json"
  if (Test-Path -LiteralPath $routeReport) {
    $json = Get-Content -LiteralPath $routeReport -Raw | ConvertFrom-Json
    $dupCount = ($json.duplicates.PSObject.Properties | Measure-Object).Count
    Say "duplicates: $dupCount"
    if ($dupCount -gt 0) { throw "Route duplicates still present. Abort." }
  } else {
    throw "Missing routes-report.json. Abort."
  }

  Say "lint..."
  npm -s run lint

  Say "typecheck..."
  npx tsc -p tsconfig.json --noEmit
}

if ($AutoCommitB) {
  $pathsToAdd = @(
    ".gitignore",
    ".vscode/tasks.json",
    ".vscode/launch.json",
    ".vscode/settings.json",
    "app/_layout.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/explore.tsx",
    "components/global-chrome.tsx",
    "components/ui/collapsible.tsx",
    "scripts/ai/_backup",
    "scripts/ai/_autoflow/lib.ps1",
    "scripts/ai/_autoflow/run.ps1"
  )

  $existing = @()
  foreach ($p in $pathsToAdd) { if (Test-Path -LiteralPath $p) { $existing += $p } }

  Say "git add (safe paths)..."
  Git-AddSafe $existing

  $didCommit = Git-CommitSafe "fix(autoflow): schtasks-safe args + stable repo root"
  if ($didCommit -and $AutoPushB) {
    Say "push..."
    git push
  }
}

Write-RunReport @{
  repo = $repo
  mode = $Mode
  time = (Get-Date).ToString("o")
  branch = (git branch --show-current).Trim()
  autocommit = $AutoCommitB
  autopush = $AutoPushB
}
Say "OK"
