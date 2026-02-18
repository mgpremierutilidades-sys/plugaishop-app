param(
  [string]$ProjectRoot = "E:\plugaishop-app",
  [string]$TaskName = "Plugaishop-GH-Queue",
  [int]$SmokeSeconds = 8
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info([string]$m){ Write-Host "[fix-gh-queue] $m" }

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot
Info "ProjectRoot=$ProjectRoot"

# 0) para task
try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch {}

# 1) normaliza config.json (FORÇA overwrite)
$cfgPath = Join-Path $ProjectRoot "scripts\ai\config.json"
if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $cfgPath ($cfgPath + ".bak_final_" + $stamp) -Force

$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($null -eq $cfg.PSObject.Properties["queue"]) { $cfg | Add-Member -Force NoteProperty queue ([pscustomobject]@{}) }
if ($null -eq $cfg.PSObject.Properties["git"])   { $cfg | Add-Member -Force NoteProperty git   ([pscustomobject]@{}) }

# repo do origin
$repo = $null
try {
  $remote = (git config --get remote.origin.url)
  if ($remote -match "github\.com[:/](.+?)/(.+?)(?:\.git)?$") { $repo = ($Matches[1] + "/" + $Matches[2]) }
} catch {}
if (-not $repo) { $repo = "mgpremierutilidades-sys/plugaishop-app" }

$base = $cfg.branch
if (-not $base -or $base.Trim() -eq "") { $base = "develop" }

# FORÇA chaves QUEUE
$cfg.queue | Add-Member -Force NoteProperty repo             $repo
$cfg.queue | Add-Member -Force NoteProperty label_queue      "ai:queue"
$cfg.queue | Add-Member -Force NoteProperty label_processing "ai:processing"
$cfg.queue | Add-Member -Force NoteProperty label_done       "ai:done"
$cfg.queue | Add-Member -Force NoteProperty label_failed     "ai:failed"
$cfg.queue | Add-Member -Force NoteProperty label_fail       "ai:failed"
$cfg.queue | Add-Member -Force NoteProperty poll_seconds     30
$cfg.queue | Add-Member -Force NoteProperty max_per_cycle    1

# FORÇA chaves GIT
$cfg.git | Add-Member -Force NoteProperty remote         "origin"
$cfg.git | Add-Member -Force NoteProperty base_branch    $base
$cfg.git | Add-Member -Force NoteProperty pr_base_branch $base
$cfg.git | Add-Member -Force NoteProperty branch_prefix  "ai/issue-"
$cfg.git | Add-Member -Force NoteProperty commit_prefix  "ai:"
$cfg.git | Add-Member -Force NoteProperty user_name      "ai-bot"
$cfg.git | Add-Member -Force NoteProperty user_email     "ai-bot@users.noreply.github.com"

($cfg | ConvertTo-Json -Depth 50) | Set-Content -Path $cfgPath -Encoding UTF8
Info "config.json atualizado (FORÇADO)."

# 2) garante labels no GH (ignora se já existir)
gh label create "ai:queue"      --color "0e8a16" --description "AI queue"      2>$null | Out-Null
gh label create "ai:processing" --color "0366d6" --description "AI processing" 2>$null | Out-Null
gh label create "ai:done"       --color "5319e7" --description "AI done"       2>$null | Out-Null
gh label create "ai:failed"     --color "b60205" --description "AI failed"     2>$null | Out-Null
Info "Labels OK."

# 3) patch robusto no worker (sem quebrar param)
$workerPath = Join-Path $ProjectRoot "scripts\ai\github-queue-worker.ps1"
if (!(Test-Path $workerPath)) { throw "worker não encontrado: $workerPath" }

Copy-Item $workerPath ($workerPath + ".bak_final_" + $stamp) -Force
$src = Get-Content $workerPath -Raw -Encoding UTF8

function Find-ParamEnd([string]$t){
  $m = [regex]::Match($t,'(?ms)^\s*param\s*\(')
  if (-not $m.Success) { return -1 }
  $i = $m.Index + $m.Length
  $d = 1
  while ($i -lt $t.Length){
    $ch = $t[$i]
    if ($ch -eq '(') { $d++ }
    elseif ($ch -eq ')') { $d--; if ($d -eq 0) { return $i } }
    $i++
  }
  return -1
}

# injeta helper depois do param(...) SE ainda não existir
if ($src -notmatch '(?m)^\s*function\s+GetCfg\s*\{'){
  $end = Find-ParamEnd $src
  if ($end -lt 0) { throw "Não achei o fim do param(...) no worker." }

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
  $pos = $end + 1
  $src = $src.Substring(0,$pos) + "`r`n" + $helper + $src.Substring($pos)
  Info "Helper GetCfg injetado no worker."
}

# substituições tolerantes a espaços (IGNORA case)
$opt = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
$src = [regex]::Replace($src, '\$labelFailed\s*=\s*\$cfg\.queue\.label_failed',
  '$labelFailed = GetCfg $cfg.queue "label_failed" (GetCfg $cfg.queue "label_fail" "ai:failed")', $opt)

$src = [regex]::Replace($src, '\$branchPrefix\s*=\s*\$cfg\.git\.branch_prefix',
  '$branchPrefix = GetCfg $cfg.git "branch_prefix" "ai/issue-"', $opt)

$src = [regex]::Replace($src, '\$commitPrefix\s*=\s*\$cfg\.git\.commit_prefix',
  '$commitPrefix = GetCfg $cfg.git "commit_prefix" "ai:"', $opt)

$src = [regex]::Replace($src, '\$baseBranch\s*=\s*\$cfg\.git\.pr_base_branch',
  '$baseBranch = GetCfg $cfg.git "pr_base_branch" (GetCfg $cfg.git "base_branch" "develop")', $opt)

Set-Content -Path $workerPath -Value $src -Encoding UTF8
Info "Worker patchado (sem crash por chave faltando)."

# 4) smoke test (logs separados)
$outDir = Join-Path $ProjectRoot "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$logOut = Join-Path $outDir "gh-queue-smoke.out.log"
$logErr = Join-Path $outDir "gh-queue-smoke.err.log"
Remove-Item $logOut,$logErr -Force -ErrorAction SilentlyContinue

$pwshExe = (Get-Command pwsh).Source
$p = Start-Process -FilePath $pwshExe -PassThru -WindowStyle Hidden -WorkingDirectory $ProjectRoot `
  -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$workerPath,"-ProjectRoot",$ProjectRoot,"-LoopSeconds","5","-Fast") `
  -RedirectStandardOutput $logOut -RedirectStandardError $logErr

Start-Sleep $SmokeSeconds
try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}

Info "SMOKE ERR tail:"
Get-Content $logErr -Tail 120 -ErrorAction SilentlyContinue
Info "SMOKE OUT tail:"
Get-Content $logOut -Tail 120 -ErrorAction SilentlyContinue

# 5) recria task com ProjectRoot absoluto e logs
$runner = Join-Path $ProjectRoot "scripts\ai\run-gh-queue-task.ps1"
@"
param([string]`$ProjectRoot,[int]`$LoopSeconds=30,[switch]`$Fast)
Set-StrictMode -Version Latest
`$ErrorActionPreference = "Stop"
Set-Location `$ProjectRoot
`$logDir = Join-Path `$ProjectRoot "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path `$logDir | Out-Null
`$out = Join-Path `$logDir "gh-queue-task.out.log"
`$err = Join-Path `$logDir "gh-queue-task.err.log"
& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path `$ProjectRoot "scripts\ai\github-queue-worker.ps1") `
  -ProjectRoot `$ProjectRoot -LoopSeconds `$LoopSeconds -Fast:`$Fast 1>>`$out 2>>`$err
"@ | Set-Content -Encoding UTF8 $runner

try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}

$action = New-ScheduledTaskAction -Execute $pwshExe `
  -Argument ("-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectRoot `"$ProjectRoot`" -LoopSeconds 30 -Fast") `
  -WorkingDirectory $ProjectRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn

# Tenta registrar normal (sem RunLevel Highest) pra evitar "Acesso negado"
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Force | Out-Null
Info "Task recriada."

Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Start-Sleep 2

Info "TASK status:"
(Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo) | Format-List LastRunTime,LastTaskResult

Info "TASK ERR tail:"
Get-Content (Join-Path $ProjectRoot "scripts\ai\_out\gh-queue-task.err.log") -Tail 200 -ErrorAction SilentlyContinue
Info "TASK OUT tail:"
Get-Content (Join-Path $ProjectRoot "scripts\ai\_out\gh-queue-task.out.log") -Tail 200 -ErrorAction SilentlyContinue
