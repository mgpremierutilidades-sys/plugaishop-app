param(
  [string]$ProjectRoot,
  [int]$SmokeSeconds = 8,
  [string]$TaskName = "Plugaishop-GH-Queue"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info([string]$m){ Write-Host "[fix-gh-queue] $m" }

if (-not $ProjectRoot -or $ProjectRoot.Trim() -eq "") {
  $ProjectRoot = (Resolve-Path ".").Path
} else {
  $ProjectRoot = (Resolve-Path $ProjectRoot).Path
}
Set-Location $ProjectRoot
Info "ProjectRoot=$ProjectRoot"

function Ensure-Dir([string]$p){ New-Item -ItemType Directory -Force -Path $p | Out-Null }
function Backup-File([string]$path){
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $path ($path + ".bak_" + $stamp) -Force
}
function Ensure-RootObj($obj, [string]$name){
  if ($null -eq $obj.PSObject.Properties[$name]) {
    $obj | Add-Member -Force NoteProperty $name ([pscustomobject]@{})
  }
  return $obj.$name
}
function Upsert-Prop($obj, [string]$name, $value){
  if ($null -eq $obj.PSObject.Properties[$name]) {
    $obj | Add-Member -Force NoteProperty $name $value
  } else {
    $obj.$name = $value
  }
}

function Stop-TaskIfExists([string]$name){
  try { Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue } catch {}
}

function Get-RepoFromOrigin {
  $repo = $null
  try {
    $remote = (git config --get remote.origin.url)
    if ($remote -match "github\.com[:/](.+?)/(.+?)(?:\.git)?$") { $repo = ($Matches[1] + "/" + $Matches[2]) }
  } catch {}
  if (-not $repo) { $repo = "mgpremierutilidades-sys/plugaishop-app" }
  return $repo
}

function Ensure-GHLabels {
  gh label create "ai:queue"      --color "0e8a16" --description "AI queue"      2>$null | Out-Null
  gh label create "ai:processing" --color "0366d6" --description "AI processing" 2>$null | Out-Null
  gh label create "ai:done"       --color "5319e7" --description "AI done"       2>$null | Out-Null
  gh label create "ai:failed"     --color "b60205" --description "AI failed"     2>$null | Out-Null
  Info "Labels OK."
}

function Normalize-Config([string]$cfgPath){
  if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }
  Backup-File $cfgPath

  $cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $queue = Ensure-RootObj $cfg "queue"
  $git   = Ensure-RootObj $cfg "git"

  $repo = Get-RepoFromOrigin
  $base = $cfg.branch
  if (-not $base -or $base -eq "") { $base = "develop" }

  # QUEUE (todas as chaves que já te quebraram)
  Upsert-Prop $queue "repo"             $repo
  Upsert-Prop $queue "label_queue"      "ai:queue"
  Upsert-Prop $queue "label_processing" "ai:processing"
  Upsert-Prop $queue "label_done"       "ai:done"
  Upsert-Prop $queue "label_failed"     "ai:failed"
  Upsert-Prop $queue "label_fail"       "ai:failed"
  Upsert-Prop $queue "poll_seconds"     30
  Upsert-Prop $queue "max_per_cycle"    1

  # GIT (todas as chaves que já te quebraram)
  Upsert-Prop $git "remote"         "origin"
  Upsert-Prop $git "base_branch"    $base
  Upsert-Prop $git "pr_base_branch" $base
  Upsert-Prop $git "branch_prefix"  "ai/issue-"
  Upsert-Prop $git "commit_prefix"  "ai:"
  Upsert-Prop $git "user_name"      "ai-bot"
  Upsert-Prop $git "user_email"     "ai-bot@users.noreply.github.com"

  ($cfg | ConvertTo-Json -Depth 50) | Set-Content -Path $cfgPath -Encoding UTF8
  Info "config.json OK (queue+git)."
}

function Patch-WorkerSafe([string]$workerPath){
  if (!(Test-Path $workerPath)) { throw "worker não encontrado: $workerPath" }
  Backup-File $workerPath

  $src = Get-Content $workerPath -Raw -Encoding UTF8

  # insere helper *depois* do param(...) (sem quebrar o param do worker)
  if ($src -notmatch "function\s+GetCfg\s*{") {
    $helper = @"
function GetCfg {
  param(
    [Parameter(Mandatory=`$true)] `$Obj,
    [Parameter(Mandatory=`$true)] [string] `$Name,
    `$Default = `$null
  )
  if (`$null -eq `$Obj) { return `$Default }
  `$p = `$Obj.PSObject.Properties[`$Name]
  if (`$p) { return `$p.Value }
  return `$Default
}

"@
    $m = [regex]::Match($src, '(?s)^\s*param\s*\(.*?\)\s*')
    if ($m.Success) {
      $insertPos = $m.Index + $m.Length
      $src = $src.Substring(0, $insertPos) + "`r`n" + $helper + $src.Substring($insertPos)
    } else {
      $src = $helper + $src
    }
    Info "Worker: helper GetCfg inserido."
  }

  # troca acessos diretos (os que aparecem nos seus logs)
  $src = [regex]::Replace($src, '\$labelFailed\s*=\s*\$cfg\.queue\.label_failed', '$labelFailed = GetCfg $cfg.queue "label_failed" (GetCfg $cfg.queue "label_fail" "ai:failed")')
  $src = [regex]::Replace($src, '\$branchPrefix\s*=\s*\$cfg\.git\.branch_prefix', '$branchPrefix = GetCfg $cfg.git "branch_prefix" "ai/issue-"')
  $src = [regex]::Replace($src, '\$commitPrefix\s*=\s*\$cfg\.git\.commit_prefix', '$commitPrefix = GetCfg $cfg.git "commit_prefix" "ai:"')
  $src = [regex]::Replace($src, '\$baseBranch\s*=\s*\$cfg\.git\.pr_base_branch', '$baseBranch = GetCfg $cfg.git "pr_base_branch" (GetCfg $cfg.git "base_branch" "develop")')

  Set-Content -Path $workerPath -Value $src -Encoding UTF8
  Info "Worker patchado (sem quebrar por chave faltando)."
}

function Smoke-Test([string]$workerPath, [string]$root, [int]$seconds){
  $outDir = Join-Path $root "scripts\ai\_out"
  Ensure-Dir $outDir

  $logOut = Join-Path $outDir "gh-queue-smoke.out.log"
  $logErr = Join-Path $outDir "gh-queue-smoke.err.log"
  Remove-Item $logOut,$logErr -Force -ErrorAction SilentlyContinue

  $pwsh = (Get-Command pwsh).Source

  $p = Start-Process -FilePath $pwsh -PassThru -WindowStyle Hidden `
    -WorkingDirectory $root `
    -ArgumentList @(
      "-NoProfile","-ExecutionPolicy","Bypass",
      "-File",$workerPath,
      "-ProjectRoot",$root,
      "-LoopSeconds","5",
      "-Fast"
    ) `
    -RedirectStandardOutput $logOut -RedirectStandardError $logErr

  Start-Sleep $seconds
  try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}

  Info "Smoke OK. ERR tail:"
  Get-Content $logErr -Tail 120 -ErrorAction SilentlyContinue
  Info "OUT tail:"
  Get-Content $logOut -Tail 120 -ErrorAction SilentlyContinue
}

function Recreate-Task([string]$root, [string]$name){
  $pwshExe = (Get-Command pwsh).Source
  $runner  = Join-Path $root "scripts\ai\run-gh-queue-task.ps1"
  Ensure-Dir (Join-Path $root "scripts\ai\_out")

@"
param(
  [string]`$ProjectRoot,
  [int]`$LoopSeconds = 30,
  [switch]`$Fast
)
Set-StrictMode -Version Latest
`$ErrorActionPreference = "Stop"
Set-Location `$ProjectRoot

`$logDir = Join-Path `$ProjectRoot "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path `$logDir | Out-Null
`$out = Join-Path `$logDir "gh-queue-task.out.log"
`$err = Join-Path `$logDir "gh-queue-task.err.log"

& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path `$ProjectRoot "scripts\ai\github-queue-worker.ps1") `
  -ProjectRoot `$ProjectRoot -LoopSeconds `$LoopSeconds -Fast:`$Fast `
  1>> `$out 2>> `$err
"@ | Set-Content -Encoding UTF8 $runner

  try { Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue } catch {}

  $action = New-ScheduledTaskAction `
    -Execute $pwshExe `
    -Argument ("-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectRoot `"$root`" -LoopSeconds 30 -Fast") `
    -WorkingDirectory $root

  $trigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -RunLevel Highest -Force | Out-Null
  Info "Scheduled Task recriada OK."
}

# -------- EXEC --------
Stop-TaskIfExists $TaskName

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI não encontrado" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git não encontrado" }

$cfgPath    = Join-Path $ProjectRoot "scripts\ai\config.json"
$workerPath = Join-Path $ProjectRoot "scripts\ai\github-queue-worker.ps1"

Normalize-Config $cfgPath
Ensure-GHLabels
Patch-WorkerSafe $workerPath
Smoke-Test $workerPath $ProjectRoot $SmokeSeconds
Recreate-Task $ProjectRoot $TaskName

Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Start-Sleep 2

Info "Task status:"
(Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo) | Format-List LastRunTime,LastTaskResult

Info "Task ERR tail:"
Get-Content (Join-Path $ProjectRoot "scripts\ai\_out\gh-queue-task.err.log") -Tail 200 -ErrorAction SilentlyContinue
