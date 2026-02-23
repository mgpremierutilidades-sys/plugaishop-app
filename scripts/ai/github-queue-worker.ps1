param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) {
    New-Item -ItemType Directory -Force -Path $p | Out-Null
  }
}

function Write-Log([string]$msg) {
  Write-Host ("[GH-QUEUE] " + $msg)
}

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

  $m = [regex]::Match($body, '(?s)<!--\s*PATCH:BEGIN\s*-->\s*(.*?)\s*<!--\s*PATCH:END\s*-->', 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value.Trim() }

  $m2 = [regex]::Match($body, '(?s)```(?:powershell|ps1|pwsh)\s*(.*?)\s*```', 'IgnoreCase')
  if ($m2.Success) { return $m2.Groups[1].Value.Trim() }

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
  # Usar cmd /c mantém compatibilidade com git/gh e strings.
  cmd.exe /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
}

function Get-IssuesSafe([string]$labelQueue) {
  $issuesJson = gh issue list --label $labelQueue --state open --limit 20 --json number,title,createdAt
  $parsed = $issuesJson | ConvertFrom-Json
  # Normaliza: sempre vira array
  return @($parsed)
}

function Safe-CheckoutBase([string]$baseBranch) {
  # garante que estamos atualizados na base
  Run-OrFail ("git checkout " + $baseBranch)
  # tentar ff-only; se falhar, só loga
  try { Run-OrFail ("git pull --ff-only origin " + $baseBranch) } catch { Write-Log ("WARN: git pull ff-only falhou: " + $_.Exception.Message) }
}

Set-Location $ProjectRoot

$aiDir  = Join-Path $ProjectRoot "scripts\ai"
$inDir  = Join-Path $aiDir "_in"
$outDir = Join-Path $aiDir "_out"
Ensure-Dir $aiDir; Ensure-Dir $inDir; Ensure-Dir $outDir

Require-Cmd "git"
Require-Cmd "gh"
Require-Cmd "node"

try { gh auth status | Out-Null } catch { throw "gh not authenticated. Run: gh auth login" }

$cfg = Load-Config (Join-Path $aiDir "config.json")

$labelQueue      = $cfg.queue.label_queue
$labelProcessing = $cfg.queue.label_processing
$labelDone       = $cfg.queue.label_done
$labelFailed     = $cfg.queue.label_failed

$branchPrefix = $cfg.git.branch_prefix
$commitPrefix = $cfg.git.commit_prefix
$baseBranch   = $cfg.git.pr_base_branch

if ([string]::IsNullOrWhiteSpace($baseBranch)) {
  try {
    $ref = (git symbolic-ref refs/remotes/origin/HEAD)
    $baseBranch = ($ref -replace '^refs/remotes/origin/', '')
  } catch {
    $baseBranch = "main"
  }
}

Write-Log ("AUTOPILOT(GH) ON | LoopSeconds=" + $LoopSeconds + " | Fast=" + $Fast.IsPresent + " | Base=" + $baseBranch)

while ($true) {
  $n = $null
  try {
    $issues = Get-IssuesSafe -labelQueue $labelQueue

    if (-not $issues -or $issues.Count -eq 0) {
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    $issue = $issues | Sort-Object createdAt | Select-Object -First 1
    $n = [int]$issue.number
    $title = [string]$issue.title
    $slug = Slug $title

    Write-Log ("Picked issue #" + $n + " - " + $title)

    # Lock: queue -> processing
    try {
      gh issue edit $n --add-label $labelProcessing --remove-label $labelQueue | Out-Null
    } catch {
      Write-Log ("WARN: Could not relabel issue #" + $n + ": " + $_.Exception.Message)
    }

    $viewJson = gh issue view $n --json body,url
    $view = $viewJson | ConvertFrom-Json
    $body = [string]$view.body
    $url  = [string]$view.url

    $patchText = Extract-Patch $body
    if ([string]::IsNullOrWhiteSpace($patchText)) {
      gh issue comment $n --body ("Nao achei patch no corpo da issue. Use markers PATCH:BEGIN/END ou ```ps1. " + $url) | Out-Null
      gh issue edit $n --add-label $labelFailed --remove-label $labelProcessing | Out-Null
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    $patchPath = Join-Path $inDir ("patch_issue_" + $n + ".ps1")
    Set-Content -Encoding UTF8 -Path $patchPath -Value $patchText
    Write-Log ("Patch written: " + $patchPath)

    # Sempre sincroniza base antes de ramificar
    Safe-CheckoutBase -baseBranch $baseBranch

    # Create branch from updated base
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
      Safe-CheckoutBase -baseBranch $baseBranch
      Start-Sleep -Seconds $LoopSeconds
      continue
    }

    Run-OrFail "git add -A"
    $msg = ($commitPrefix + " Issue #" + $n + " - " + $title)
    Run-OrFail ('git commit -m "' + $msg.Replace('"','') + '"')

    # Push (mantém --force-with-lease porque você usa checkout -B e pode reprocessar)
    Run-OrFail ("git push -u origin " + $branch + " --force-with-lease")

    # PR
    $prTitle = ("[AI] #" + $n + " " + $title)
    $prBody  = ("Automated by GH Queue Worker.`n`nCloses #" + $n + "`nSource: " + $url)

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
    Safe-CheckoutBase -baseBranch $baseBranch

  } catch {
    $err = $_.Exception.Message
    Write-Log ("ERROR: " + $err)

    # Se conseguimos identificar a issue, marca como failed e remove processing
    if ($n -ne $null) {
      try {
        gh issue comment $n --body ("Falha no worker: " + $err) | Out-Null
        gh issue edit $n --add-label $labelFailed --remove-label $labelProcessing | Out-Null
      } catch {
        Write-Log ("WARN: Could not mark issue failed/comment: " + $_.Exception.Message)
      }
    }

    # tenta voltar para base para não ficar em branch quebrada
    try { Safe-CheckoutBase -baseBranch $baseBranch } catch { }
  }

  Start-Sleep -Seconds $LoopSeconds
}