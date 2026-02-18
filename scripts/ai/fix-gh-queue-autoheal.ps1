param(
  [string]$ProjectRoot = "E:\plugaishop-app"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info([string]$m){ Write-Host "[autoheal] $m" }

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot
Info "ProjectRoot=$ProjectRoot"

# sanity
if (-not (Get-Command gh  -ErrorAction SilentlyContinue)) { throw "gh CLI não encontrado" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git não encontrado" }

$cfgPath = Join-Path $ProjectRoot "scripts\ai\config.json"
if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }

# backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $cfgPath ($cfgPath + ".bak_autoheal_" + $stamp) -Force

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

# workdir isolado (chave nova)
$workdir = Join-Path $ProjectRoot "scripts\ai\_work\repo"

# FORCE chaves QUEUE
$cfg.queue | Add-Member -Force NoteProperty repo             $repo
$cfg.queue | Add-Member -Force NoteProperty label_queue      "ai:queue"
$cfg.queue | Add-Member -Force NoteProperty label_processing "ai:processing"
$cfg.queue | Add-Member -Force NoteProperty label_done       "ai:done"
$cfg.queue | Add-Member -Force NoteProperty label_failed     "ai:failed"
$cfg.queue | Add-Member -Force NoteProperty label_fail       "ai:failed"
$cfg.queue | Add-Member -Force NoteProperty poll_seconds     30
$cfg.queue | Add-Member -Force NoteProperty max_per_cycle    1
$cfg.queue | Add-Member -Force NoteProperty workdir          $workdir

# FORCE chaves GIT
$cfg.git | Add-Member -Force NoteProperty remote         "origin"
$cfg.git | Add-Member -Force NoteProperty base_branch    $base
$cfg.git | Add-Member -Force NoteProperty pr_base_branch $base
$cfg.git | Add-Member -Force NoteProperty branch_prefix  "ai/issue-"
$cfg.git | Add-Member -Force NoteProperty commit_prefix  "ai:"
$cfg.git | Add-Member -Force NoteProperty user_name      "ai-bot"
$cfg.git | Add-Member -Force NoteProperty user_email     "ai-bot@users.noreply.github.com"

($cfg | ConvertTo-Json -Depth 50) | Set-Content -Path $cfgPath -Encoding UTF8
Info "config.json OK (chaves garantidas + workdir)."

# garante labels GH
gh label create "ai:queue"      --color "0e8a16" --description "AI queue"       2>$null | Out-Null
gh label create "ai:processing" --color "0366d6" --description "AI processing"  2>$null | Out-Null
gh label create "ai:done"       --color "5319e7" --description "AI done"        2>$null | Out-Null
gh label create "ai:failed"     --color "b60205" --description "AI failed"      2>$null | Out-Null
Info "Labels OK."
