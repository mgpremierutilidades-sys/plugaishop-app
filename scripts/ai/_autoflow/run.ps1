# scripts/ai/_autoflow/run.ps1
[CmdletBinding()]
param(
  [ValidateSet("full","verify","hygiene")]
  [string]$Mode = "full",

  # bool (e não switch) pq você chama via schtasks: -AutoCommit $true -AutoPush $true
  [bool]$AutoCommit = $true,
  [bool]$AutoPush = $true,

  # caminho do log (scheduler sempre deve setar isso)
  [string]$LogFile = "scripts/ai/_out/autoflow-task.log"
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib.ps1"

$repo = Ensure-RepoRoot

function Ensure-OutDir {
  $p = Join-Path $repo "scripts\ai\_out"
  New-Item -ItemType Directory -Force -Path $p | Out-Null
}

Ensure-OutDir

# Log em arquivo + console (sem quebrar execução interativa)
$logPath = Join-Path $repo $LogFile
try {
  Start-Transcript -Path $logPath -Append | Out-Null
} catch {
  # transcript pode falhar em alguns contextos; seguimos sem travar
}

try {
  Say "repo: $repo"
  Say "mode: $Mode"
  Say "autoCommit: $AutoCommit"
  Say "autoPush: $AutoPush"
  Say "log: $LogFile"

  # 1) Hygiene
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

  # 3) Auto-commit do estado atual (paths “safe”)
  if ($AutoCommit) {
    $pathsToAdd = @(
      ".gitignore",
      ".vscode/tasks.json",
      ".vscode/launch.json",
      "app/_layout.tsx",
      "app/(tabs)/_layout.tsx",
      "app/(tabs)/explore.tsx",
      "components/global-chrome.tsx",
      "components/ui/collapsible.tsx",
      "scripts/ai/_backup",
      "scripts/ai/_autoflow/lib.ps1",
      "scripts/ai/_autoflow/run.ps1",
      "scripts/ai/_autoflow/task_entry.ps1",
      "scripts/ai/_autoflow/recreate_schtask.ps1"
    )

    $existing = @()
    foreach ($p in $pathsToAdd) { if (Test-Path -LiteralPath $p) { $existing += $p } }

    Say "git add (safe paths)..."
    Git-AddSafe $existing

    $didCommit = Git-CommitSafe "chore(autoflow): hourly verify runner"
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
  exit 0
}
catch {
  # loga e sai com erro (Task Scheduler vai mostrar LastResult != 0)
  Write-Host ("[autoflow] ERROR: " + $_.Exception.Message)
  try { $_ | Out-String | Add-Content -LiteralPath $logPath } catch {}
  exit 1
}
finally {
  try { Stop-Transcript | Out-Null } catch {}
}
