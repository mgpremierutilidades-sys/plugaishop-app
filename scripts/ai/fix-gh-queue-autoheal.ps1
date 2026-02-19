param(
  [Parameter(Mandatory=$true)][string]$ProjectRoot,
  [int]$SmokeSeconds = 4,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Info([string]$m){ Write-Host "[autoheal] $m" }

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot
Info "ProjectRoot=$ProjectRoot | Fast=$Fast | SmokeSeconds=$SmokeSeconds"

if (-not (Get-Command gh   -ErrorAction SilentlyContinue)) { throw "gh CLI não encontrado" }
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { throw "git não encontrado" }
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) { throw "pwsh não encontrado" }

try { gh auth status | Out-Null } catch { throw "gh não autenticado. Rode: gh auth login" }

$aiDir    = Join-Path $ProjectRoot "scripts\ai"
$outDir   = Join-Path $aiDir "_out"
$stateDir = Join-Path $aiDir "_state"
New-Item -ItemType Directory -Force -Path $outDir   | Out-Null
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$cfgPath = Join-Path $aiDir "config.json"
if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }

$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($null -eq $cfg.PSObject.Properties["queue"]) { $cfg | Add-Member -Force NoteProperty queue ([pscustomobject]@{}) }
if ($null -eq $cfg.PSObject.Properties["git"])   { $cfg | Add-Member -Force NoteProperty git   ([pscustomobject]@{}) }

$repo = $null
try {
  $remoteUrl = (git config --get remote.origin.url)
  if ($remoteUrl -match "github\.com[:/](.+?)/(.+?)(?:\.git)?$") {
    $repo = ($Matches[1] + "/" + $Matches[2])
  }
} catch {}
if (-not $repo) { $repo = "mgpremierutilidades-sys/plugaishop-app" }

$base = $cfg.branch
if (-not $base -or $base.Trim() -eq "") { $base = "develop" }

$cfg.queue | Add-Member -Force NoteProperty repo             $repo
$cfg.queue | Add-Member -Force NoteProperty label_queue      "ai:queue"
$cfg.queue | Add-Member -Force NoteProperty label_processing "ai:processing"
$cfg.queue | Add-Member -Force NoteProperty label_done       "ai:done"
$cfg.queue | Add-Member -Force NoteProperty label_failed     "ai:failed"
$cfg.queue | Add-Member -Force NoteProperty label_fail       "ai:failed"
$cfg.queue | Add-Member -Force NoteProperty poll_seconds     ($(if($Fast){ 5 } else { 30 }))
$cfg.queue | Add-Member -Force NoteProperty max_per_cycle    1

$cfg.git | Add-Member -Force NoteProperty remote         "origin"
$cfg.git | Add-Member -Force NoteProperty base_branch    $base
$cfg.git | Add-Member -Force NoteProperty pr_base_branch $base
$cfg.git | Add-Member -Force NoteProperty branch_prefix  "ai/issue-"
$cfg.git | Add-Member -Force NoteProperty commit_prefix  "ai:"
$cfg.git | Add-Member -Force NoteProperty user_name      "ai-bot"
$cfg.git | Add-Member -Force NoteProperty user_email     "ai-bot@users.noreply.github.com"

($cfg | ConvertTo-Json -Depth 50) | Set-Content -Path $cfgPath -Encoding UTF8
Info "config.json OK (chaves garantidas). repo=$repo base=$base"

try { & gh label create "ai:queue"      -R $repo --color "0e8a16" --description "AI queue"      2>$null | Out-Null } catch {}
try { & gh label create "ai:processing" -R $repo --color "0366d6" --description "AI processing" 2>$null | Out-Null } catch {}
try { & gh label create "ai:done"       -R $repo --color "5319e7" --description "AI done"       2>$null | Out-Null } catch {}
try { & gh label create "ai:failed"     -R $repo --color "b60205" --description "AI failed"     2>$null | Out-Null } catch {}
Info "Labels OK."

$workerPath = Join-Path $aiDir "github-queue-worker.ps1"
if (!(Test-Path $workerPath)) { throw "worker não encontrado: $workerPath" }

$logOut = Join-Path $outDir "gh-queue-smoke.out.log"
$logErr = Join-Path $outDir "gh-queue-smoke.err.log"
Remove-Item $logOut,$logErr -Force -ErrorAction SilentlyContinue

$pwshExe = (Get-Command pwsh).Source

$smokeArgs = @(
  "-NoProfile","-ExecutionPolicy","Bypass",
  "-File",$workerPath,
  "-ProjectRoot",$ProjectRoot,
  "-LoopSeconds","2"
)
if ($Fast) { $smokeArgs += @("-Fast") }

$p = Start-Process -FilePath $pwshExe -PassThru -WindowStyle Hidden -WorkingDirectory $ProjectRoot `
  -ArgumentList $smokeArgs `
  -RedirectStandardOutput $logOut -RedirectStandardError $logErr

Start-Sleep -Seconds $SmokeSeconds
try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}

Info "SMOKE OK."
exit 0
