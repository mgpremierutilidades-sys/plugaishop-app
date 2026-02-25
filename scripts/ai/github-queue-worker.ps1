param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 30,
  [int]$IssueNumber = 0,
  [string]$Repo = "",
  [switch]$Once,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Log([string]$msg) { Write-Host ("[GH-QUEUE] " + $msg) }

function New-DirectoryIfMissing([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Assert-Cmd([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Required command not found: $name" }
}

function Invoke-OrFail([string]$cmd) {
  Write-Log ("$ " + $cmd)
  if ($IsWindows) {
    cmd /c $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
    return
  }

  bash -lc $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
}

function Invoke-WithRetry([scriptblock]$Action, [int]$Max = 3, [int]$SleepSec = 10) {
  for ($i=1; $i -le $Max; $i++) {
    try { & $Action; return }
    catch {
      Write-Log ("Retry $i/$Max failed: " + $_.Exception.Message)
      if ($i -eq $Max) { throw }
      Start-Sleep -Seconds $SleepSec
    }
  }
}

function Git-RollbackClean() {
  try {
    Invoke-OrFail "git reset --hard HEAD"
    Invoke-OrFail "git clean -fd"
  } catch {
    Write-Log ("Rollback cleanup failed (best-effort): " + $_.Exception.Message)
  }
}

function Ensure-LocalGitExcludes() {
  # Não comita lixo local
  $excludePath = Join-Path $ProjectRoot ".git/info/exclude"
  $rules = @(
    "_autonomy_bundle/",
    "scripts/ai/_out/bundle_*/",
    "scripts/ai/_out/bundle-*/",
    "scripts/ai/_out/*.zip",
    "tools/autonomy-core/_out/*.zip"
  )
  $existing = ""
  if (Test-Path -LiteralPath $excludePath) { $existing = (Get-Content -LiteralPath $excludePath -Raw -ErrorAction SilentlyContinue) }
  foreach ($r in $rules) {
    if ($existing -notmatch [regex]::Escape($r)) {
      Add-Content -LiteralPath $excludePath -Value $r
    }
  }
}

function Detect-RepoFromGit() {
  try {
    $remoteUrl = (git config --get remote.origin.url)
    if ($remoteUrl -match "github\.com[:/](.+?)/(.+?)(?:\.git)?$") {
      return ($Matches[1] + "/" + $Matches[2])
    }
  } catch {}
  return ""
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

$aiDir  = Join-Path $ProjectRoot "scripts/ai"
$inDir  = Join-Path $aiDir "_in"
$outDir = Join-Path $aiDir "_out"
New-DirectoryIfMissing $aiDir
New-DirectoryIfMissing $inDir
New-DirectoryIfMissing $outDir

Assert-Cmd "git"
Assert-Cmd "gh"
Assert-Cmd "node"
Assert-Cmd "pwsh"
if (-not $IsWindows) { Assert-Cmd "bash" }

$env:GH_PAGER = "cat"
$env:GH_NO_UPDATE_NOTIFIER = "1"
$env:GIT_TERMINAL_PROMPT = "0"

try { gh auth status | Out-Null } catch { throw "gh not authenticated (set GH_TOKEN or run: gh auth login)" }

Ensure-LocalGitExcludes

# Resolve repo
$repo = $Repo
if ([string]::IsNullOrWhiteSpace($repo)) { $repo = Detect-RepoFromGit }
if ([string]::IsNullOrWhiteSpace($repo)) { throw "Repo not resolved. Provide -Repo owner/name or set remote.origin.url" }

$baseBranch = "main"

# Labels
$labelQueue = "ai:queue"
$labelProcessing = "ai:processing"
$labelDone = "ai:done"
$labelFail = "ai:failed"

function Process-Issue([int]$n) {
  Invoke-WithRetry -Max 3 -SleepSec 10 -Action {
    Git-RollbackClean

    $issue = gh issue view $n -R $repo --json number,title,url,body --jq "{number:.number,title:.title,url:.url,body:(.body // \"\")}" | ConvertFrom-Json
    $title = $issue.title
    $url = $issue.url

    Write-Log ("Processing #" + $n + " " + $title)

    # Branch per issue
    Invoke-OrFail ("git fetch origin " + $baseBranch)
    Invoke-OrFail ("git checkout -B " + $baseBranch + " origin/" + $baseBranch)

    $safe = ("issue-" + $n)
    $branch = ("autonomy/" + $safe)
    Invoke-OrFail ("git checkout -B " + $branch)

    # Execução do ciclo (usa scripts do repo)
    # Aqui você já tem pipeline/runner: mantemos o contrato.
    Invoke-OrFail ("npm run autonomy")

    # Se não mudou nada, marca como done e volta
    $status = (git status --porcelain)
    if ([string]::IsNullOrWhiteSpace($status)) {
      Write-Log "No changes detected."
      gh issue edit $n -R $repo --add-label $labelDone --remove-label $labelProcessing | Out-Null
      Invoke-OrFail ("git checkout " + $baseBranch)
      return
    }

    Invoke-OrFail "git add -A"

    $msg = ("chore(autonomy): #" + $n + " " + $title).Replace('"','')
    Invoke-OrFail ('git commit -m "' + $msg + '"')

    Invoke-OrFail ("git push -u origin " + $branch + " --force-with-lease")

    # PR best-effort
    $prTitle = ("[AI] #" + $n + " " + $title)
    $prBody  = ("Automated by GH Queue Worker.`n`nCloses #" + $n + "`nSource: " + $url)
    $prUrl = ""
    try {
      $prUrl = gh pr create -R $repo --title $prTitle --body $prBody --base $baseBranch --head $branch
    } catch {
      try { $prUrl = gh pr view -R $repo --head $branch --json url --jq .url } catch { $prUrl = "" }
    }

    if (-not [string]::IsNullOrWhiteSpace($prUrl)) {
      gh issue comment $n -R $repo --body ("PR criado/atualizado: " + $prUrl) | Out-Null
    } else {
      gh issue comment $n -R $repo --body ("Push feito na branch " + $branch + " mas falhei ao criar PR automaticamente.") | Out-Null
    }

    gh issue edit $n -R $repo --add-label $labelDone --remove-label $labelProcessing | Out-Null
    Invoke-OrFail ("git checkout " + $baseBranch)
  }
}

while ($true) {
  try {
    if ($IssueNumber -gt 0) {
      Process-Issue -n $IssueNumber
      exit 0
    }

    # Local mode: poll issues labeled ai:queue
    $json = gh issue list -R $repo --label $labelQueue --state open --limit 10 --json number --jq ".[].number"
    $nums = @()
    if (-not [string]::IsNullOrWhiteSpace($json)) { $nums = $json -split "`n" | Where-Object { $_ } | ForEach-Object { [int]$_ } }

    foreach ($n in $nums) {
      try {
        gh issue edit $n -R $repo --add-label $labelProcessing --remove-label $labelQueue | Out-Null
      } catch {}

      try {
        Process-Issue -n $n
      } catch {
        Write-Log ("ERROR issue #" + $n + ": " + $_.Exception.Message)
        try { gh issue edit $n -R $repo --add-label $labelFail --remove-label $labelProcessing | Out-Null } catch {}
        try { gh issue comment $n -R $repo --body ("Falha no worker: " + $_.Exception.Message) | Out-Null } catch {}
        Git-RollbackClean
      }
    }

    if ($Once) { exit 0 }
  } catch {
    Write-Log ("FATAL LOOP ERROR: " + $_.Exception.Message)
    Git-RollbackClean
    if ($Once -or $IssueNumber -gt 0) { exit 1 }
  }

  Start-Sleep -Seconds $LoopSeconds
}