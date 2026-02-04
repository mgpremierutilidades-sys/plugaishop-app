[CmdletBinding()]
param(
  [ValidateSet("full","verify","hygiene")]
  [string]$Mode = "full",
  [switch]$AutoCommit = $true,
  [switch]$AutoPush = $true
)

. "$PSScriptRoot\lib.ps1"

$repo = Ensure-RepoRoot
Say "repo: $repo"
Say "mode: $Mode"

# 1) Hygiene (não “enfia” coisas grandes no repo)
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

# 2) Gates: routes -> lint -> tsc
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

# 3) Auto-commit do estado atual (sem reescrever nada)
if ($AutoCommit) {
  # Commita o que estiver modificado (incluindo seus 6 arquivos + tasks)
  $pathsToAdd = @(
    ".gitignore",
    ".vscode/tasks.json",
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

  $didCommit = Git-CommitSafe "chore(autoflow): handsfree state + vscode tasks + hygiene runner"
  if ($didCommit -and $AutoPush) {
    Say "push..."
    git push
  }
}

Write-RunReport @{
  repo = $repo
  mode = $Mode
  time = (Get-Date).ToString("o")
  branch = (git branch --show-current).Trim()
}
Say "OK"
