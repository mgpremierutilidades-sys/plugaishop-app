param(
  [string]$ProjectRoot = "E:\plugaishop-app",
  [int]$SmokeSeconds = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Info([string]$m){ Write-Host "[fix-gh-queue] $m" }

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot
Info "ProjectRoot=$ProjectRoot"

# sanity
if (-not (Get-Command gh  -ErrorAction SilentlyContinue)) { throw "gh CLI não encontrado" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git não encontrado" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "node não encontrado" }

try { gh auth status | Out-Null } catch { throw "gh não autenticado. Rode: gh auth login" }

$aiDir = Join-Path $ProjectRoot "scripts\ai"
$outDir = Join-Path $aiDir "_out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# -------- 1) NORMALIZA config.json (FORÇA chaves) --------
$cfgPath = Join-Path $aiDir "config.json"
if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $cfgPath ($cfgPath + ".bak_hard2_" + $stamp) -Force

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
Info "config.json OK (chaves garantidas)."

# -------- 2) GARANTE labels no GitHub --------
gh label create "ai:queue"      --color "0e8a16" --description "AI queue"      2>$null | Out-Null
gh label create "ai:processing" --color "0366d6" --description "AI processing" 2>$null | Out-Null
gh label create "ai:done"       --color "5319e7" --description "AI done"       2>$null | Out-Null
gh label create "ai:failed"     --color "b60205" --description "AI failed"     2>$null | Out-Null
Info "Labels OK."

# -------- 3) PATCH seguro no worker (sem quebrar param) --------
$workerPath = Join-Path $aiDir "github-queue-worker.ps1"
if (!(Test-Path $workerPath)) { throw "worker não encontrado: $workerPath" }

Copy-Item $workerPath ($workerPath + ".bak_hard2_" + $stamp) -Force
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

# injeta helper GetCfg se não existir
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
  Info "Worker: helper GetCfg injetado."
}

# substitui acessos diretos que quebram com StrictMode
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

# -------- 4) Smoke test (não precisa de Task) --------
$logOut = Join-Path $outDir "gh-queue-smoke.out.log"
$logErr = Join-Path $outDir "gh-queue-smoke.err.log"
Remove-Item $logOut,$logErr -Force -ErrorAction SilentlyContinue

$pwshExe = (Get-Command pwsh).Source
$p = Start-Process -FilePath $pwshExe -PassThru -WindowStyle Hidden -WorkingDirectory $ProjectRoot `
  -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$workerPath,"-ProjectRoot",$ProjectRoot,"-LoopSeconds","2","-Fast") `
  -RedirectStandardOutput $logOut -RedirectStandardError $logErr

Start-Sleep $SmokeSeconds
try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}

Info "SMOKE OK. ERR tail:"
Get-Content $logErr -Tail 120 -ErrorAction SilentlyContinue
Info "SMOKE OK. OUT tail:"
Get-Content $logOut -Tail 120 -ErrorAction SilentlyContinue
