$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path ".").Path
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

$CoreDir     = Join-Path $RepoRoot "tools/autonomy-core"
$OutDir      = Join-Path $CoreDir "_out"
$StatePath   = Join-Path $CoreDir "state.json"
$TasksPath   = Join-Path $CoreDir "tasks.json"
$MetricsPath = Join-Path $CoreDir "metrics.json"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ts  = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$log = Join-Path $OutDir ("run-" + $ts + ".log")
$err = Join-Path $OutDir ("run-" + $ts + ".err.log")

function Read-Json([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

# Executa via cmd.exe para evitar problemas com npm shims no Windows
function Run-CmdLine([string]$commandLine) {
  Add-Content -Path $log -Encoding UTF8 -Value ("`n$ cmd: " + $commandLine)

  $exe  = "$env:ComSpec"   # cmd.exe
  $args = "/c " + $commandLine

  $p = Start-Process -FilePath $exe `
    -ArgumentList $args `
    -WorkingDirectory $RepoRoot `
    -NoNewWindow -PassThru -Wait `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err

  return $p.ExitCode
}

# ===== Load state/metrics =====
$state = Read-Json $StatePath
if ($null -eq $state) {
  $state = @{
    v = 1
    last_run_utc = $null
    last_result = $null
    last_task_id = $null
    consecutive_failures = 0
    notes = @()
  }
}

$metrics = Read-Json $MetricsPath
if ($null -eq $metrics) { throw "Missing metrics.json at: $MetricsPath" }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

# ===== Controller =====
$ctrlJson = & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "controller.ps1") `
  -RepoRoot $RepoRoot -TasksPath $TasksPath -StatePath $StatePath
$ctrl = $ctrlJson | ConvertFrom-Json

$notes = New-Object System.Collections.Generic.List[string]
$notes.Add("mode=" + $ctrl.mode)

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

$ok = ($lintResult -eq "ok" -or $lintResult -eq "skipped") -and ($typeResult -eq "ok" -or $typeResult -eq "skipped")

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

# ===== Persist state (INLINE, sem função para evitar bug de binding) =====
$stateJson = ($state | ConvertTo-Json -Depth 50)
$stateJson | Out-File -FilePath $StatePath -Encoding UTF8 -Force

# ===== Report =====
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

& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $CoreDir "report.ps1") -OutDir $OutDir -RunSummary $runSummary

if (-not $ok) {
  Write-Host "[autonomy] Gates FAILED. See logs in tools/autonomy-core/_out/"
  exit 1
}

Write-Host "[autonomy] Gates OK."
exit 0