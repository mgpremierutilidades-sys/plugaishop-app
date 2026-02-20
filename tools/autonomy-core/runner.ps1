$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path ".").Path
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

$CoreDir     = Join-Path $RepoRoot "tools/autonomy-core"
$OutDir      = Join-Path $CoreDir "_out"
$StateDir    = Join-Path $CoreDir "_state"

$StatePath   = Join-Path $StateDir "state.json"
$TasksPath   = Join-Path $StateDir "tasks.json"
$MetricsPath = Join-Path $CoreDir "metrics.json"

$StateSeed   = Join-Path $CoreDir "state.seed.json"
$TasksSeed   = Join-Path $CoreDir "tasks.seed.json"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$ts  = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$log = Join-Path $OutDir ("run-" + $ts + ".log")
$err = Join-Path $OutDir ("run-" + $ts + ".err.log")

function Read-Json([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-Json([string]$Path, [object]$Value, [int]$Depth = 50) {
  ($Value | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $Path -Encoding UTF8 -Force
}

function Ensure-RuntimeFile([string]$RuntimePath, [string]$SeedPath) {
  if (Test-Path $RuntimePath) { return }
  if (!(Test-Path $SeedPath)) { throw "Missing seed file: $SeedPath" }
  Copy-Item -LiteralPath $SeedPath -Destination $RuntimePath -Force
}

# npm via cmd.exe (evita shims Win32)
function Run-CmdLine([string]$commandLine) {
  Add-Content -Path $log -Encoding UTF8 -Value ("`n$ cmd: " + $commandLine)

  $exe  = "$env:ComSpec"
  $args = "/c " + $commandLine

  $p = Start-Process -FilePath $exe `
    -ArgumentList $args `
    -WorkingDirectory $RepoRoot `
    -NoNewWindow -PassThru -Wait `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err

  return $p.ExitCode
}

function Finalize-Task([object]$Ctrl, [bool]$Ok) {
  if ($null -eq $Ctrl) { return }
  if ($Ctrl.mode -ne "execute") { return }
  if ($null -eq $Ctrl.task) { return }

  $tasks = Read-Json $TasksPath
  if ($null -eq $tasks -or $null -eq $tasks.queue) { return }

  foreach ($t in $tasks.queue) {
    if ($t.id -eq $Ctrl.task.id) {
      $now = (Get-Date).ToUniversalTime().ToString("s") + "Z"
      if ($Ok) {
        $t.status = "done"
        $t.completed_utc = $now
      } else {
        $t.status = "failed"
        $t.failed_utc = $now
      }
    }
  }

  Write-Json $TasksPath $tasks 50
}

# ===== Ensure runtime state/tasks exist =====
Ensure-RuntimeFile -RuntimePath $StatePath -SeedPath $StateSeed
Ensure-RuntimeFile -RuntimePath $TasksPath -SeedPath $TasksSeed

# ===== Load state/metrics =====
$state = Read-Json $StatePath
if ($null -eq $state) { throw "Runtime state.json unreadable: $StatePath" }

$metrics = Read-Json $MetricsPath
if ($null -eq $metrics) { throw "Missing metrics.json at: $MetricsPath" }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

# ===== Controller (ROBUST JSON PARSE: first '{' to last '}') =====
$ctrlLines = & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "controller.ps1") `
  -RepoRoot $RepoRoot -TasksPath $TasksPath -StatePath $StatePath 2>&1

$ctrlText = ($ctrlLines | ForEach-Object { $_.ToString() }) -join "`n"

$first = $ctrlText.IndexOf("{")
$last  = $ctrlText.LastIndexOf("}")
if ($first -lt 0 -or $last -le $first) {
  throw "controller.ps1 did not emit JSON. Output was:`n$ctrlText"
}

$ctrlJson = $ctrlText.Substring($first, $last - $first + 1)

try {
  $ctrl = $ctrlJson | ConvertFrom-Json
} catch {
  throw "Controller JSON parse failed. JSON was:`n$ctrlJson`n--- Full output ---`n$ctrlText"
}

$notes = New-Object System.Collections.Generic.List[string]
$notes.Add("mode=" + $ctrl.mode)

# ===== Executor (aplica ação real da task) =====
$executorOk = $true
$committedSha = $null

if ($ctrl.mode -eq "execute" -and $null -ne $ctrl.task) {
  $notes.Add("task_id=" + $ctrl.task.id)
  $notes.Add("task_title=" + $ctrl.task.title)

  $taskJson = ($ctrl.task | ConvertTo-Json -Depth 20)

  $execLines = & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "executor.ps1") `
    -RepoRoot $RepoRoot -TaskJson $taskJson -MetricsPath $MetricsPath 2>&1

  $execText = ($execLines | ForEach-Object { $_.ToString() }) -join "`n"

  # ===== Executor JSON parse (ROBUST: first '{' to last '}') =====
  $firstE = $execText.IndexOf("{")
  $lastE  = $execText.LastIndexOf("}")
  if ($firstE -lt 0 -or $lastE -le $firstE) {
    $executorOk = $false
    $notes.Add("executor_parse_fail")
    $notes.Add("executor_output=" + $execText.Replace("`n"," | "))
  } else {
    $execJson = $execText.Substring($firstE, $lastE - $firstE + 1)
    $exec = $execJson | ConvertFrom-Json
    $executorOk = [bool]$exec.ok

    foreach ($n in $exec.notes) { $notes.Add("exec:" + [string]$n) }
    if ($exec.committed_sha) { $committedSha = [string]$exec.committed_sha }
  }

} else {
  $notes.Add("executor=skipped")
}

# ===== Gates =====
$lintResult = "skipped"
$typeResult = "skipped"

if ($metrics.gates.lint.enabled -eq $true) {
  $code = Run-CmdLine "npm run lint"
  $lintResult = ($code -eq 0) ? "ok" : ("fail(" + $code + ")")
  $notes.Add("lint_exit=" + $code)
}

if ($metrics.gates.typecheck.enabled -eq $true) {
  $code = Run-CmdLine "npm run typecheck"
  $typeResult = ($code -eq 0) ? "ok" : ("fail(" + $code + ")")
  $notes.Add("typecheck_exit=" + $code)
}

$gatesOk = ($lintResult -eq "ok" -or $lintResult -eq "skipped") -and ($typeResult -eq "ok" -or $typeResult -eq "skipped")
$ok = $executorOk -and $gatesOk

# ===== Rollback if enabled + commit exists + gates failed =====
if (-not $ok) {
  if ($metrics.rollback.enabled -eq $true -and $committedSha) {
    $notes.Add("rollback_attempt=" + $committedSha)
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "rollback.ps1") -CommitSha $committedSha
    $notes.Add("rollback_done=" + $committedSha)
  }
}

# ===== Update state =====
$state.last_run_utc = (Get-Date).ToUniversalTime().ToString("s") + "Z"
$state.last_task_id = ($ctrl.task.id ?? $null)

if ($ok) {
  $state.last_result = "ok"
  $state.consecutive_failures = 0
} else {
  $state.last_result = "fail"
  $state.consecutive_failures = [int]$state.consecutive_failures + 1
}

Write-Json $StatePath $state 50

# ===== Finalize task =====
try {
  Finalize-Task -Ctrl $ctrl -Ok:$ok
  if ($ctrl.mode -eq "execute" -and $null -ne $ctrl.task) {
    $notes.Add("task_finalized=" + ($ok ? "done" : "failed"))
  }
} catch {
  $notes.Add("task_finalize_error=" + $_.Exception.Message)
}

# ===== Report via JSON =====
$runSummary = @{
  result = $state.last_result
  branch = $branch
  last_task_id = $state.last_task_id
  gates = @{
    lint = $lintResult
    typecheck = $typeResult
  }
  notes = $notes.ToArray()
}

$runSummaryPath = Join-Path $OutDir ("runSummary-" + $ts + ".json")
Write-Json $runSummaryPath $runSummary 20

& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "report.ps1") `
  -OutDir $OutDir -RunSummaryPath $runSummaryPath

if (-not $ok) {
  Write-Host "[autonomy] FAILED. See logs in tools/autonomy-core/_out/"
  exit 1
}

Write-Host "[autonomy] OK."
exit 0