<<<<<<< HEAD
param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

$aiDir  = Join-Path $ProjectRoot "scripts\ai"
$outDir = Join-Path $aiDir "_out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$runtimeOut = Join-Path $outDir "gh-queue-worker.runtime.out.log"
$runtimeErr = Join-Path $outDir "gh-queue-worker.runtime.err.log"

function LogOut([string]$m){
  $ts = (Get-Date).ToString("s")
  [System.IO.File]::AppendAllText($runtimeOut, "[$ts] [GH-QUEUE] $m`n", [System.Text.Encoding]::UTF8)
}
function LogErr([string]$m){
  $ts = (Get-Date).ToString("s")
  [System.IO.File]::AppendAllText($runtimeErr, "[$ts] [GH-QUEUE] $m`n", [System.Text.Encoding]::UTF8)
}

# Avoid interactive/pager/update noise
$env:GH_PAGER = "cat"
$env:GH_NO_UPDATE_NOTIFIER = "1"
$env:GIT_TERMINAL_PROMPT = "0"

# --- Load config
$cfgPath = Join-Path $aiDir "config.json"
if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }

$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$repo = $cfg.queue.repo
if (-not $repo) { throw "cfg.queue.repo vazio (config.json)" }

$labelQueue      = $cfg.queue.label_queue
$labelProcessing = $cfg.queue.label_processing
$labelDone       = $cfg.queue.label_done
$labelFailed     = $cfg.queue.label_failed

$pollSeconds = [int]$cfg.queue.poll_seconds
$maxPerCycle = [int]$cfg.queue.max_per_cycle
if ($Fast) { $pollSeconds = 5 }

$ghTimeoutSec = if ($Fast) { 12 } else { 20 }

# --- CRITICAL: use absolute gh.exe path (prevents alias/function recursion)
$ghExe = (Get-Command gh -ErrorAction Stop).Source

LogOut "BOOT | Repo=$repo | Poll=$pollSeconds | MaxPerCycle=$maxPerCycle | LoopSeconds=$LoopSeconds | Fast=$Fast | GhTimeoutSec=$ghTimeoutSec | GhExe=$ghExe"

function Exec-Process {
  param(
    [Parameter(Mandatory=$true)][string]$FileName,
    [Parameter(Mandatory=$true)][string[]]$Args,
    [int]$TimeoutSeconds = 20
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.CreateNoWindow = $true

  foreach ($a in $Args) { [void]$psi.ArgumentList.Add($a) }

  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi

  if (-not $p.Start()) { throw "failed to start: $FileName" }

  $exited = $p.WaitForExit($TimeoutSeconds * 1000)
  if (-not $exited) {
    try { $p.Kill($true) } catch {}
    throw "TIMEOUT ${TimeoutSeconds}s: $FileName $($Args -join ' ')"
  }

  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()

  return [pscustomobject]@{
    ExitCode = $p.ExitCode
    StdOut   = $stdout
    StdErr   = $stderr
  }
}

function Gh {
  param([Parameter(Mandatory=$true)][string[]]$Args)

  $res = Exec-Process -FileName $ghExe -Args $Args -TimeoutSeconds $ghTimeoutSec

  if (-not [string]::IsNullOrWhiteSpace($res.StdErr)) {
    LogErr "gh stderr (exit=$($res.ExitCode)) args=[$($Args -join ' ')] err=[$($res.StdErr.Trim())]"
  }

  if ($res.ExitCode -ne 0) {
    LogErr "gh FAILED exit=$($res.ExitCode) args=[$($Args -join ' ')] out=[$($res.StdOut.Trim())]"
    throw "gh failed exit=$($res.ExitCode)"
  }

  return $res.StdOut
}

function Ensure-JsonArray {
  param([string]$text)
  if ([string]::IsNullOrWhiteSpace($text)) { return "[]" }
  $t = $text.Trim()
  if ($t.StartsWith("[")) { return $t }

  $start = $t.IndexOf("[")
  $end   = $t.LastIndexOf("]")
  if ($start -ge 0 -and $end -gt $start) {
    return $t.Substring($start, $end - $start + 1)
  }
  return "[]"
}

$stopAt = (Get-Date).AddSeconds($LoopSeconds)

while ((Get-Date) -lt $stopAt) {
  try {
    LogOut "LIST begin"
    $raw = Gh @("issue","list","-R",$repo,"-l",$labelQueue,"-L","50","--json","number,title")
    $jsonText = Ensure-JsonArray $raw
    LogOut ("LIST ok | bytes=" + $jsonText.Length)

    $issues = $jsonText | ConvertFrom-Json
    $count = @($issues).Count
    LogOut "CYCLE | queue_count=$count"

    if ($count -le 0) {
      Start-Sleep -Seconds $pollSeconds
      continue
    }

    $picked = @($issues | Select-Object -First $maxPerCycle)
    foreach ($it in $picked) {
      $n = [int]$it.number
      $t = [string]$it.title
      LogOut "PICK | #$n | $t"

      LogOut "EDIT begin | #$n -> processing"
      Gh @("issue","edit",$n,"-R",$repo,"--remove-label",$labelQueue,"--add-label",$labelProcessing) | Out-Null
      LogOut "EDIT ok | #$n -> $labelProcessing"

      LogOut "EDIT begin | #$n -> done"
      Gh @("issue","edit",$n,"-R",$repo,"--add-label",$labelDone,"--remove-label",$labelProcessing) | Out-Null
      LogOut "EDIT ok | #$n -> $labelDone"
    }
  } catch {
    $etype = $_.Exception.GetType().FullName
    LogErr "ERROR | type=$etype | msg=$($_.Exception.Message)"
    if ($_.ScriptStackTrace) { LogErr ("STACK | " + $_.ScriptStackTrace.Replace("`r","").Replace("`n"," | ")) }
  }

  Start-Sleep -Seconds $pollSeconds
}

LogOut "EXIT | LoopSeconds elapsed"
exit 0
=======
param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Write-Log([string]$msg) { Write-Host ("[GH-QUEUE] " + $msg) }

function Load-Config([string]$cfgPath) {
  if (-not (Test-Path $cfgPath)) { throw "Missing config.json: $cfgPath" }
  return (Get-Content $cfgPath -Raw | ConvertFrom-Json)
}

function Require-Cmd([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Required command not found: $name" }
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

Set-Location $ProjectRoot

$aiDir = Join-Path $ProjectRoot "scripts\ai"
$inDir = Join-Path $aiDir "_in"
$outDir = Join-Path $aiDir "_out"
Ensure-Dir $aiDir; Ensure-Dir $inDir; Ensure-Dir $outDir

Require-Cmd "git"
Require-Cmd "gh"
Require-Cmd "node"

# Basic gh auth check
try { gh auth status | Out-Null } catch { throw "gh not authenticated. Run: gh auth login" }

$cfg = Load-Config (Join-Path $aiDir "config.json")

$labelQueue = $cfg.queue.label_queue
$labelProcessing = $cfg.queue.label_processing
$labelDone = $cfg.queue.label_done
$labelFailed = $cfg.queue.label_failed

$branchPrefix = $cfg.git.branch_prefix
$commitPrefix = $cfg.git.commit_prefix
$baseBranch = $cfg.git.pr_base_branch

if ([string]::IsNullOrWhiteSpace($baseBranch)) {
  # detect default branch from origin/HEAD
  try {
    $ref = (git symbolic-ref refs/remotes/origin/HEAD)
    $baseBranch = ($ref -replace '^refs/remotes/origin/', '')
  } catch {
    $baseBranch = "main"
  }
}

Write-Log ("AUTOPILOT(GH) ON | LoopSeconds=" + $LoopSeconds + " | Fast=" + $Fast.IsPresent)

while ($true) {
  try {
    # Get oldest queued issue (stable processing)
    $issuesJson = gh issue list --label $labelQueue --state open --limit 20 --json number,title,createdAt
    $issues = $issuesJson | ConvertFrom-Json

    if (-not $issues -or $issues.Count -eq 0) {
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    $issue = $issues | Sort-Object createdAt | Select-Object -First 1
    $n = [int]$issue.number
    $title = [string]$issue.title
    $slug = Slug $title

    Write-Log ("Picked issue #" + $n + " - " + $title)

    # Move to processing (lock)
    try {
      gh issue edit $n --add-label $labelProcessing --remove-label $labelQueue | Out-Null
    } catch {
      Write-Log ("Could not relabel issue #" + $n + " (continuing anyway): " + $_.Exception.Message)
    }

    $viewJson = gh issue view $n --json body,url
    $view = $viewJson | ConvertFrom-Json
    $body = [string]$view.body
    $url = [string]$view.url

    $patchText = Extract-Patch $body
    if ([string]::IsNullOrWhiteSpace($patchText)) {
      gh issue comment $n --body ("Nao achei patch no corpo da issue. Use markers PATCH:BEGIN/END ou ```ps1. " + $url) | Out-Null
      gh issue edit $n --add-label $labelFailed | Out-Null
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    $patchPath = Join-Path $inDir ("patch_issue_" + $n + ".ps1")
    Set-Content -Encoding UTF8 -Path $patchPath -Value $patchText
    Write-Log ("Patch written: " + $patchPath)

    # Create branch
    $branch = ($branchPrefix + "-" + $n + "-" + $slug)
    Run-OrFail ("git checkout -B " + $branch)
    Run-OrFail "git status --porcelain"

    # Apply patch + gates
    $runner = Join-Path $aiDir "run_ai_patch.ps1"
    if (-not (Test-Path $runner)) { throw "Missing runner: $runner" }

    $runnerCmd = 'pwsh -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -ProjectRoot "' + $ProjectRoot + '" -PatchFile "' + $patchPath + '"'
    if ($Fast) { $runnerCmd += " -Fast" }
    Run-OrFail $runnerCmd

    # Commit if changes
    $changed = (git status --porcelain)
    if ([string]::IsNullOrWhiteSpace($changed)) {
      gh issue comment $n --body ("Patch aplicado mas nao gerou diff. Nada para commitar. " + $url) | Out-Null
      gh issue edit $n --add-label $labelDone --remove-label $labelProcessing | Out-Null
      Run-OrFail ("git checkout " + $baseBranch)
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    Run-OrFail "git add -A"
    $msg = ($commitPrefix + " Issue #" + $n + " - " + $title)
    Run-OrFail ('git commit -m "' + $msg.Replace('"','') + '"')

    # Push
    Run-OrFail ("git push -u origin " + $branch + " --force-with-lease")

    # PR
    $prTitle = ("[AI] #" + $n + " " + $title)
    $prBody = ("Automated by GH Queue Worker.`n`nCloses #" + $n + "`nSource: " + $url)
    $prUrl = ""
    try {
      $prUrl = gh pr create --title $prTitle --body $prBody --base $baseBranch --head $branch
    } catch {
      # maybe PR already exists
      try { $prUrl = gh pr view --head $branch --json url --jq .url } catch { $prUrl = "" }
    }

    if (-not [string]::IsNullOrWhiteSpace($prUrl)) {
      gh issue comment $n --body ("PR criado/atualizado: " + $prUrl) | Out-Null
    } else {
      gh issue comment $n --body ("Push feito na branch " + $branch + " mas falhei ao criar PR automaticamente.") | Out-Null
    }

    gh issue edit $n --add-label $labelDone --remove-label $labelProcessing | Out-Null

    # Back to base
    Run-OrFail ("git checkout " + $baseBranch)

  } catch {
    Write-Log ("ERROR: " + $_.Exception.Message)
  }

  Start-Sleep -Seconds $LoopSeconds
}
>>>>>>> 367dfdc (chore(ai): patch inicial #14)
