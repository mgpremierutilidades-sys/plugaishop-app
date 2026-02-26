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
$log = Join-Path $OutDir ("Invoke-" + $ts + ".log")
$err = Join-Path $OutDir ("Invoke-" + $ts + ".err.log")

$notes = New-Object System.Collections.Generic.List[string]

$trigger = $null
try {
  if ($env:AUTONOMY_TRIGGER -and $env:AUTONOMY_TRIGGER.Trim().Length -gt 0) {
    $trigger = $env:AUTONOMY_TRIGGER.Trim()
  } elseif ($env:GITHUB_EVENT_NAME -and $env:GITHUB_EVENT_NAME.Trim().Length -gt 0) {
    $trigger = $env:GITHUB_EVENT_NAME.Trim()
  } else {
    $trigger = "unknown"
  }
} catch {
  $trigger = "unknown"
}

function Read-Json([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-Json([string]$Path, [object]$Value, [int]$Depth = 50) {
  ($Value | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $Path -Encoding UTF8 -Force
}

function Initialize-RuntimeFile([string]$RuntimePath, [string]$SeedPath) {
  if (Test-Path $RuntimePath) { return }
  if (!(Test-Path $SeedPath)) { throw "Missing seed file: $SeedPath" }
  Copy-Item -LiteralPath $SeedPath -Destination $RuntimePath -Force
}

function Invoke-CmdLine([string]$commandLine) {
  Add-Content -Path $log -Encoding UTF8 -Value ("`n$ cmd: " + $commandLine)

  $exe  = "$env:ComSpec"
  $cliArgs = "/c " + $commandLine

  $p = Start-Process -FilePath $exe `
    -ArgumentList $cliArgs `
    -WorkingDirectory $RepoRoot `
    -NoNewWindow -PassThru -Wait `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err

  return $p.ExitCode
}

function Complete-TaskById([string]$TaskId, [bool]$Ok) {
  if (-not $TaskId) { return $false }

  $id = $TaskId.ToString().Trim()
  if (-not $id) { return $false }

  $tasks = Read-Json $TasksPath
  if ($null -eq $tasks -or $null -eq $tasks.queue) { return $false }

  $updated = $false
  foreach ($t in $tasks.queue) {
    if ($null -eq $t.id) { continue }
    if ($t.id.ToString().Trim() -eq $id) {

      $now = (Get-Date).ToUniversalTime().ToString("s") + "Z"

      if ($Ok) {
        $t.status = "done"
        $t | Add-Member -NotePropertyName "completed_utc" -NotePropertyValue $now -Force
        if ($t.PSObject.Properties.Name -contains "failed_utc") {
          $t | Add-Member -NotePropertyName "failed_utc" -NotePropertyValue $null -Force
        }
      } else {
        $t.status = "failed"
        $t | Add-Member -NotePropertyName "failed_utc" -NotePropertyValue $now -Force
        if ($t.PSObject.Properties.Name -contains "completed_utc") {
          $t | Add-Member -NotePropertyName "completed_utc" -NotePropertyValue $null -Force
        }
      }

      $updated = $true
      break
    }
  }

  if ($updated) {
    Write-Json $TasksPath $tasks 50
  }

  return $updated
}

Initialize-RuntimeFile -RuntimePath $StatePath -SeedPath $StateSeed
Initialize-RuntimeFile -RuntimePath $TasksPath -SeedPath $TasksSeed

$state = Read-Json $StatePath
if ($null -eq $state) { throw "Runtime state.json unreadable: $StatePath" }

$metrics = Read-Json $MetricsPath
if ($null -eq $metrics) { throw "Missing metrics.json at: $MetricsPath" }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

try {
  $migratePath = Join-Path $CoreDir "migrate.ps1"
  if (Test-Path $migratePath) {
    $null = & pwsh -NoProfile -ExecutionPolicy Bypass -File $migratePath -CoreDir $CoreDir
    $notes.Add("migrate_ran=true")
  } else {
    $notes.Add("migrate_missing=true")
  }
} catch {
  if ($null -eq $notes) { $notes = New-Object System.Collections.Generic.List[string] }
  $notes.Add("migrate_error=" + $_.Exception.Message)
}

try {
  $bridgePath = Join-Path $CoreDir "backlog_bridge.ps1"
  $backlogPath = Join-Path $RepoRoot "ops/backlog.queue.yml"
  if ((Test-Path $bridgePath) -and (Test-Path $backlogPath)) {
    $bridgeLines = & pwsh -NoProfile -ExecutionPolicy Bypass -File $bridgePath `
      -RepoRoot $RepoRoot -TasksPath $TasksPath -BacklogPath $backlogPath -Mode import 2>&1
    $bridgeText = ($bridgeLines | ForEach-Object { $_.ToString() }) -join "`n"
    $notes.Add("backlog_bridge_import_ran=true")
    if ($bridgeText) { Add-Content -Path $log -Encoding UTF8 -Value ("`n[backlog_bridge]`n" + $bridgeText) }
  } else {
    $notes.Add("backlog_bridge_import_skipped=true")
  }
} catch {
  $notes.Add("backlog_bridge_import_error=" + $_.Exception.Message)
}

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

$notes.Add("mode=" + $ctrl.mode)
$notes.Add("trigger=" + $trigger)

try {
  $StatePath2 = Join-Path $CoreDir "_state\state.json"
  if (Test-Path $StatePath2) {
    $stRaw = Get-Content $StatePath2 -Raw
    $st = $stRaw | ConvertFrom-Json
    $cf = 0
    if ($st -and $st.PSObject.Properties.Name -contains "consecutive_failures") {
      $cf = [int]($st.consecutive_failures)
    }
    if ($cf -ge 3) {
      $notes.Add("paused_due_to_failures")
      $notes.Add("consecutive_failures=" + $cf)
      $ctrl.mode = "observe"
    }
  }
} catch {
  $notes.Add("pause_guard_error=" + $_.Exception.Message)
}

$executorOk = $true
$committedSha = $null

if ($ctrl.mode -eq "execute" -and $null -ne $ctrl.task) {
  $notes.Add("task_id=" + $ctrl.task.id)
  $notes.Add("task_title=" + $ctrl.task.title)

  $taskJson = ($ctrl.task | ConvertTo-Json -Depth 20)

  $execLines = & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "executor.ps1") `
    -RepoRoot $RepoRoot -TaskJson $taskJson -MetricsPath $MetricsPath 2>&1

  $execText = ($execLines | ForEach-Object { $_.ToString() }) -join "`n"

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

$lintResult = "skipped"
$typeResult = "skipped"

if ($metrics.gates.lint.enabled -eq $true) {
  $code = Invoke-CmdLine "npm run lint"
  $lintResult = ($code -eq 0) ? "ok" : ("fail(" + $code + ")")
  $notes.Add("lint_exit=" + $code)
}

if ($metrics.gates.typecheck.enabled -eq $true) {
  $code = Invoke-CmdLine "npm run typecheck"
  $typeResult = ($code -eq 0) ? "ok" : ("fail(" + $code + ")")
  $notes.Add("typecheck_exit=" + $code)
}

$gatesOk = ($lintResult -eq "ok" -or $lintResult -eq "skipped") -and ($typeResult -eq "ok" -or $typeResult -eq "skipped")
$ok = $executorOk -and $gatesOk

if (-not $ok) {
  if ($metrics.rollback.enabled -eq $true -and $committedSha) {
    $notes.Add("rollback_attempt=" + $committedSha)
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "rollback.ps1") -CommitSha $committedSha
    $notes.Add("rollback_done=" + $committedSha)
  }
}

$state.last_run_utc = (Get-Date).ToUniversalTime().ToString("s") + "Z"

$state.last_task_id = $null
try {
  if ($ctrl -and ($ctrl.PSObject.Properties.Name -contains "task") -and $ctrl.task -and ($ctrl.task.PSObject.Properties.Name -contains "id")) {
    $state.last_task_id = [string]$ctrl.task.id
  }
} catch {
  $state.last_task_id = $null
}

if ($ok) {
  $state.last_result = "ok"
  $state.consecutive_failures = 0
} else {
  $state.last_result = "fail"
  $state.consecutive_failures = [int]$state.consecutive_failures + 1
}

Write-Json $StatePath $state 50

try {
  $hbPath = Join-Path $StateDir "heartbeat.json"

  $runId = ""
  $wf = ""
  $ref = ""
  $sha = ""
  if ($env:GITHUB_RUN_ID) { $runId = [string]$env:GITHUB_RUN_ID }
  if ($env:GITHUB_WORKFLOW) { $wf = [string]$env:GITHUB_WORKFLOW }
  if ($env:GITHUB_REF) { $ref = [string]$env:GITHUB_REF }
  if ($env:GITHUB_SHA) { $sha = [string]$env:GITHUB_SHA }

  $hb = @{
    v = 1
    heartbeat_utc = (Get-Date).ToUniversalTime().ToString("s") + "Z"
    trigger = $trigger
    result = $state.last_result
    last_task_id = $state.last_task_id
    run_id = $runId
    workflow = $wf
    ref = $ref
    sha = $sha
  }

  Write-Json $hbPath $hb 10
  $notes.Add("heartbeat_written=true")
} catch {
  $notes.Add("heartbeat_error=" + $_.Exception.Message)
}

try {
  $finalized = $false

  if ($state.last_task_id) {
    $notes.Add("task_finalize_attempt=" + $state.last_task_id)
    $finalized = Complete-TaskById -TaskId $state.last_task_id -Ok:$ok
    $notes.Add("task_finalize_updated=" + ($finalized ? "true" : "false"))
  } else {
    $notes.Add("task_finalize_skipped=no_last_task_id")
  }

  if (-not $finalized -and $ok) {
    $tasksNow = Read-Json $TasksPath
    if ($tasksNow -and $tasksNow.queue) {
      $run = $null
      foreach ($t in $tasksNow.queue) {
        if ($t.status -eq "running") { $run = $t; break }
      }
      if ($null -ne $run -and $run.id) {
        $notes.Add("task_recovery_attempt=" + $run.id)
        $finalized2 = Complete-TaskById -TaskId $run.id -Ok:$true
        $notes.Add("task_recovery_updated=" + ($finalized2 ? "true" : "false"))
      } else {
        $notes.Add("task_recovery_skipped=no_running_found")
      }
    } else {
      $notes.Add("task_recovery_skipped=tasks_unreadable")
    }
  }

  if ($state.last_task_id) {
    $notes.Add("task_finalized=" + ($ok ? "done" : "failed"))
  }
} catch {
  $notes.Add("task_finalize_error=" + $_.Exception.Message)
}

try {
  $bridgePath = Join-Path $CoreDir "backlog_bridge.ps1"
  $backlogPath = Join-Path $RepoRoot "ops/backlog.queue.yml"
  if ((Test-Path $bridgePath) -and (Test-Path $backlogPath)) {
    $syncLines = & pwsh -NoProfile -ExecutionPolicy Bypass -File $bridgePath `
      -RepoRoot $RepoRoot -TasksPath $TasksPath -BacklogPath $backlogPath -Mode sync 2>&1
    $syncText = ($syncLines | ForEach-Object { $_.ToString() }) -join "`n"
    $notes.Add("backlog_bridge_sync_ran=true")
    if ($syncText) { Add-Content -Path $log -Encoding UTF8 -Value ("`n[backlog_bridge_sync]`n" + $syncText) }
  } else {
    $notes.Add("backlog_bridge_sync_skipped=true")
  }
} catch {
  $notes.Add("backlog_bridge_sync_error=" + $_.Exception.Message)
}

$runId2 = ""
$wf2 = ""
$ref2 = ""
$sha2 = ""
if ($env:GITHUB_RUN_ID) { $runId2 = [string]$env:GITHUB_RUN_ID }
if ($env:GITHUB_WORKFLOW) { $wf2 = [string]$env:GITHUB_WORKFLOW }
if ($env:GITHUB_REF) { $ref2 = [string]$env:GITHUB_REF }
if ($env:GITHUB_SHA) { $sha2 = [string]$env:GITHUB_SHA }

$runSummary = @{
  result = $state.last_result
  branch = $branch
  last_task_id = $state.last_task_id
  trigger = $trigger
  run_id = $runId2
  workflow = $wf2
  ref = $ref2
  sha = $sha2
  gates = @{
    lint = $lintResult
    typecheck = $typeResult
  }
  notes = $notes.ToArray()
}

$runSummaryPath = Join-Path $OutDir ("runSummary-" + $ts + ".json")
Write-Json $runSummaryPath $runSummary 20

$latestRunSummaryPath = Join-Path $OutDir "latest_run_summary.json"
Write-Json $latestRunSummaryPath $runSummary 20

& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "report.ps1") `
  -OutDir $OutDir -RunSummaryPath $runSummaryPath

try {
  $keep = 30
  if ($metrics.report -and $metrics.report.keep_last) { $keep = [int]$metrics.report.keep_last }
  if ($keep -lt 5) { $keep = 5 }

  function Remove-OldFilesByPattern([string]$dir, [string]$pattern, [int]$keep) {
    if (-not (Test-Path $dir)) { return }
    $files = Get-ChildItem -Path $dir -File -Filter $pattern | Sort-Object LastWriteTimeUtc -Descending
    if ($files.Count -le $keep) { return }
    $toDelete = $files | Select-Object -Skip $keep
    foreach ($f in $toDelete) {
      try { Remove-Item -LiteralPath $f.FullName -Force } catch {}
    }
  }

  Remove-OldFilesByPattern -dir $OutDir -pattern "report-*.md" -keep $keep
  Remove-OldFilesByPattern -dir $OutDir -pattern "Invoke-*.log" -keep $keep
  Remove-OldFilesByPattern -dir $OutDir -pattern "Invoke-*.err.log" -keep $keep
  Remove-OldFilesByPattern -dir $OutDir -pattern "runSummary-*.json" -keep $keep
} catch {
  $notes.Add("prune_error=" + $_.Exception.Message)
}

if (-not $ok) {
  Write-Information "[autonomy] FAILED. See logs in tools/autonomy-core/_out/" -InformationAction Continue
  exit 1
}

Write-Information "[autonomy] OK." -InformationAction Continue
exit 0