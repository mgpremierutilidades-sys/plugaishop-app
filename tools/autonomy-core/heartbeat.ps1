# tools/autonomy-core/heartbeat.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [string]$HeartbeatRelPath = "tools/autonomy-core/_state/heartbeat.json",
  [string]$HeartbeatBranch = "autonomy/heartbeat",
  [string]$CommitMessagePrefix = "chore(autonomy): heartbeat",
  [string]$ActorName = "autonomy-bot",
  [string]$ActorEmail = "autonomy-bot@users.noreply.github.com"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) { throw "GITHUB_TOKEN missing in environment." }

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

$nowUtc = (Get-Date).ToUniversalTime().ToString("s") + "Z"

$hbAbs = Join-Path $RepoRoot $HeartbeatRelPath
$hbDir = Split-Path -Parent $hbAbs
if ($hbDir -and -not (Test-Path -LiteralPath $hbDir)) {
  New-Item -ItemType Directory -Path $hbDir -Force | Out-Null
}

$hbObj = [ordered]@{
  v = 1
  heartbeat_utc = $nowUtc
  trigger = ($env:AUTONOMY_TRIGGER ?? "")
  run_id = ($env:GITHUB_RUN_ID ?? "")
  workflow = ($env:GITHUB_WORKFLOW ?? "")
  ref = ($env:GITHUB_REF ?? "")
  sha = ($env:GITHUB_SHA ?? "")
}

($hbObj | ConvertTo-Json -Depth 10) | Out-File -FilePath $hbAbs -Encoding UTF8 -Force

# ===== Publish heartbeat to dedicated branch via worktree =====
git config user.name  $ActorName | Out-Null
git config user.email $ActorEmail | Out-Null

# ensure we have branch reference (fetch if exists)
git fetch origin $HeartbeatBranch --depth=1 2>$null | Out-Null

$wtRoot = Join-Path $RepoRoot ".git\worktrees"
$worktreeDir = Join-Path $RepoRoot ".autonomy-heartbeat-worktree"

# cleanup previous if exists
if (Test-Path -LiteralPath $worktreeDir) {
  try { git worktree remove --force $worktreeDir 2>$null | Out-Null } catch {}
  try { Remove-Item -LiteralPath $worktreeDir -Recurse -Force -ErrorAction SilentlyContinue } catch {}
}

# create worktree on heartbeat branch
$branchExists = $true
try {
  git show-ref --verify --quiet ("refs/remotes/origin/" + $HeartbeatBranch) | Out-Null
} catch { $branchExists = $false }

if ($branchExists) {
  git worktree add $worktreeDir ("origin/" + $HeartbeatBranch) | Out-Null
  [System.IO.Directory]::SetCurrentDirectory($worktreeDir)
  git checkout -B $HeartbeatBranch | Out-Null
} else {
  git worktree add --detach $worktreeDir | Out-Null
  [System.IO.Directory]::SetCurrentDirectory($worktreeDir)
  git checkout --orphan $HeartbeatBranch | Out-Null
  # wipe everything for orphan branch
  Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

# copy only heartbeat file into worktree
$dstAbs = Join-Path $worktreeDir $HeartbeatRelPath
$dstDir = Split-Path -Parent $dstAbs
if ($dstDir -and -not (Test-Path -LiteralPath $dstDir)) {
  New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
}
Copy-Item -LiteralPath $hbAbs -Destination $dstAbs -Force

git add $HeartbeatRelPath | Out-Null

$changes = $true
try {
  git diff --cached --quiet | Out-Null
  $changes = $false
} catch { $changes = $true }

if ($changes) {
  $msg = "$CommitMessagePrefix ($nowUtc)"
  git commit -m $msg | Out-Null
  git push origin $HeartbeatBranch | Out-Null
}

# return to repo root and cleanup worktree
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)
try { git worktree remove --force $worktreeDir 2>$null | Out-Null } catch {}
try { Remove-Item -LiteralPath $worktreeDir -Recurse -Force -ErrorAction SilentlyContinue } catch {}