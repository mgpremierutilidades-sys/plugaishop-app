param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,

  # Local mode: loop/poll
  [int]$LoopSeconds = 30,

  # GitHub Actions mode: process only this issue and exit
  [int]$IssueNumber = 0,

  # GitHub repo "owner/name" (overrides config + auto-detect)
  [string]$Repo = "",

  # Force single-cycle execution (useful in CI)
  [switch]$Once,

  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Ensure-Dir([string]$p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Write-Log([string]$msg) { Write-Host ("[GH-QUEUE] " + $msg) }

function Require-Cmd([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Required command not found: $name" }
}

function Load-Config([string]$cfgPath) {
  if (-not (Test-Path $cfgPath)) { throw "Missing config.json: $cfgPath" }
  return (Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Save-Config([string]$cfgPath, [object]$cfg) {
  ($cfg | ConvertTo-Json -Depth 50) | Set-Content -Path $cfgPath -Encoding UTF8
}

function Ensure-ConfigKeys([object]$cfg) {
  # cria sub-objetos se não existirem
  if ($null -eq $cfg.PSObject.Properties["queue"]) { $cfg | Add-Member -Force NoteProperty queue ([pscustomobject]@{}) }
  if ($null -eq $cfg.PSObject.Properties["git"])   { $cfg | Add-Member -Force NoteProperty git   ([pscustomobject]@{}) }
  if ($null -eq $cfg.PSObject.Properties["branch"]) { $cfg | Add-Member -Force NoteProperty branch "main" }

  # defaults queue
  $cfg.queue | Add-Member -Force NoteProperty label_queue      "ai:queue"
  $cfg.queue | Add-Member -Force NoteProperty label_processing "ai:processing"
  $cfg.queue | Add-Member -Force NoteProperty label_done       "ai:done"
  $cfg.queue | Add-Member -Force NoteProperty label_failed     "ai:failed"
  $cfg.queue | Add-Member -Force NoteProperty poll_seconds     30
  $cfg.queue | Add-Member -Force NoteProperty max_per_cycle    1
  if ($null -eq $cfg.queue.PSObject.Properties["repo"]) { $cfg.queue | Add-Member -Force NoteProperty repo "" }

  # defaults git
  $cfg.git | Add-Member -Force NoteProperty remote         "origin"
  $cfg.git | Add-Member -Force NoteProperty base_branch    $cfg.branch
  $cfg.git | Add-Member -Force NoteProperty pr_base_branch $cfg.branch
  $cfg.git | Add-Member -Force NoteProperty branch_prefix  "ai/issue"
  $cfg.git | Add-Member -Force NoteProperty commit_prefix  "ai:"
  $cfg.git | Add-Member -Force NoteProperty user_name      "ai-bot"
  $cfg.git | Add-Member -Force NoteProperty user_email     "ai-bot@users.noreply.github.com"

  return $cfg
}

function Extract-Patch([string]$body) {
  if ([string]::IsNullOrWhiteSpace($body)) { return $null }

  # Preferred: HTML markers
  $m = [regex]::Match($body, '(?s)<!--\s*PATCH:BEGIN\s*-->\s*(.*?)\s*<!--\s*PATCH:END\s*-->', 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value.Trim() }

  # Alternative: ```ps1 ... ```
  $m2 = [regex]::Match($body, '(?s)```(?:powershell|ps1|pwsh)\s*(.*?)\s*```', 'IgnoreCase')
  if ($m2.Success) { return $m2.Groups[1].Value.Trim() }

  # Fallback: ``` ... ```
  $m3 = [regex]::Match($body, '(?s)```\s*(.*?)\s*```', 'IgnoreCase')
  if ($m3.Success) { return $m3.Groups[1].Value.Trim() }

  return $null
}

function Slug([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return "work" }
  $t = $s.ToLowerInvariant()
  $t = [regex]::Replace($t, '[^a-z0-9]+', '-').Trim('-')
  if ($t.Length -gt 40) { $t = $t.Substring(0,40).Trim('-') }
  if ([string]::IsNullOrWhiteSpace($t)) { return "work" }
  return $t
}

function Run-OrFail([string]$cmd) {
  Write-Log ("$ " + $cmd)
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
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

$aiDir = Join-Path $ProjectRoot "scripts\ai"
$inDir = Join-Path $aiDir "_in"
$outDir = Join-Path $aiDir "_out"
Ensure-Dir $aiDir; Ensure-Dir $inDir; Ensure-Dir $outDir

Require-Cmd "git"
Require-Cmd "gh"
Require-Cmd "node"
Require-Cmd "pwsh"

# Avoid interactive/pager/update noise
$env:GH_PAGER = "cat"
$env:GH_NO_UPDATE_NOTIFIER = "1"
$env:GIT_TERMINAL_PROMPT = "0"

# Basic gh auth check (Actions usa GH_TOKEN)
try { gh auth status | Out-Null } catch { throw "gh not authenticated (set GH_TOKEN or run: gh auth login)" }

$cfgPath = Join-Path $aiDir "config.json"
$cfg = Load-Config $cfgPath
$cfg = Ensure-ConfigKeys $cfg
Save-Config $cfgPath $cfg

# Resolve repo
$repo = $Repo
if ([string]::IsNullOrWhiteSpace($repo)) { $repo = $cfg.queue.repo }
if ([string]::IsNullOrWhiteSpace($repo)) { $repo = Detect-RepoFromGit }
if ([string]::IsNullOrWhiteSpace($repo)) { throw "Repo not resolved. Provide -Repo owner/name or set config.json queue.repo" }

$labelQueue = $cfg.queue.label_queue
$labelProcessing = $cfg.queue.label_processing
$labelDone = $cfg.queue.label_done
$labelFailed = $cfg.queue.label_failed

$branchPrefix = $cfg.git.branch_prefix
$commitPrefix = $cfg.git.commit_prefix
$baseBranch = $cfg.git.pr_base_branch

if ([string]::IsNullOrWhiteSpace($baseBranch)) {
  try {
    $ref = (git symbolic-ref refs/remotes/origin/HEAD)
    $baseBranch = ($ref -replace '^refs/remotes/origin/', '')
  } catch { $baseBranch = "main" }
}

if ($Fast) { $LoopSeconds = 5 }

Write-Log ("BOOT | Repo=$repo | IssueNumber=$IssueNumber | LoopSeconds=$LoopSeconds | Once=" + $Once.IsPresent + " | Fast=" + $Fast.IsPresent)

function Get-IssueToProcess() {
  if ($IssueNumber -gt 0) {
    # valida se tem label queue (ou processing), senão sai
    $ij = gh issue view $IssueNumber -R $repo --json number,title,labels,body,url
    $iv = $ij | ConvertFrom-Json
    $labels = @($iv.labels | ForEach-Object { $_.name })
    if (($labels -contains $labelQueue) -or ($labels -contains $labelProcessing)) { return $iv }
    Write-Log ("Issue #" + $IssueNumber + " does not have label " + $labelQueue + " (skipping).")
    return $null
  }

  $issuesJson = gh issue list -R $repo --label $labelQueue --state open --limit 20 --json number,title,createdAt
  $issues = $issuesJson | ConvertFrom-Json
  if (-not $issues -or $issues.Count -eq 0) { return $null }

  $picked = $issues | Sort-Object createdAt | Select-Object -First 1
  $ij = gh issue view $picked.number -R $repo --json number,title,labels,body,url
  return ($ij | ConvertFrom-Json)
}

while ($true) {
  $issue = $null
  try {
    $issue = Get-IssueToProcess
    if ($null -eq $issue) {
      if ($Once -or $IssueNumber -gt 0) { exit 0 }
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    $n = [int]$issue.number
    $title = [string]$issue.title
    $slug = Slug $title
    $url = [string]$issue.url
    $body = [string]$issue.body

    Write-Log ("Picked issue #" + $n + " - " + $title)

    # Move to processing (best effort lock)
    try {
      gh issue edit $n -R $repo --add-label $labelProcessing --remove-label $labelQueue | Out-Null
    } catch {
      Write-Log ("Could not relabel issue #" + $n + " (continuing): " + $_.Exception.Message)
    }

    $patchText = Extract-Patch $body
    if ([string]::IsNullOrWhiteSpace($patchText)) {
      gh issue comment $n -R $repo --body ("Nao achei patch no corpo da issue. Use markers PATCH:BEGIN/END ou ```ps1. " + $url) | Out-Null
      gh issue edit $n -R $repo --add-label $labelFailed | Out-Null
      if ($Once -or $IssueNumber -gt 0) { exit 0 }
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    $patchPath = Join-Path $inDir ("patch_issue_" + $n + ".ps1")
    Set-Content -Encoding UTF8 -Path $patchPath -Value $patchText
    Write-Log ("Patch written: " + $patchPath)

    # Create branch
    $branch = ($branchPrefix + "-" + $n + "-" + $slug)
    Run-OrFail ("git checkout -B " + $branch)

    # Apply patch + gates
    $runner = Join-Path $aiDir "run_ai_patch.ps1"
    if (-not (Test-Path $runner)) { throw "Missing runner: $runner" }

    $runnerCmd = 'pwsh -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -ProjectRoot "' + $ProjectRoot + '" -PatchFile "' + $patchPath + '"'
    if ($Fast) { $runnerCmd += " -Fast" }
    Run-OrFail $runnerCmd

    # Commit if changes
    $changed = (git status --porcelain)
    if ([string]::IsNullOrWhiteSpace($changed)) {
      gh issue comment $n -R $repo --body ("Patch aplicado mas nao gerou diff. Nada para commitar. " + $url) | Out-Null
      gh issue edit $n -R $repo --add-label $labelDone --remove-label $labelProcessing | Out-Null
      Run-OrFail ("git checkout " + $baseBranch)
      if ($Once -or $IssueNumber -gt 0) { exit 0 }
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    Run-OrFail "git add -A"
    $msg = ($commitPrefix + " Issue #" + $n + " - " + $title)
    $msg = $msg.Replace('"','')
    Run-OrFail ('git commit -m "' + $msg + '"')

    Run-OrFail ("git push -u origin " + $branch + " --force-with-lease")

    # PR
    $prTitle = ("[AI] #" + $n + " " + $title)
    $prBody = ("Automated by GH Queue Worker.`n`nCloses #" + $n + "`nSource: " + $url)
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
    Run-OrFail ("git checkout " + $baseBranch)

    if ($Once -or $IssueNumber -gt 0) { exit 0 }
  } catch {
    Write-Log ("ERROR: " + $_.Exception.Message)
    if ($Once -or $IssueNumber -gt 0) { exit 1 }
  }

  Start-Sleep -Seconds $LoopSeconds
}
