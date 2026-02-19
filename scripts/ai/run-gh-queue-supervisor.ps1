param(
  [Parameter(Mandatory=$true)][string]$ProjectRoot,
  [int]$LoopSeconds = 10,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$AiDir    = Join-Path $ProjectRoot "scripts\ai"
$OutDir   = Join-Path $AiDir "_out"
$StateDir = Join-Path $AiDir "_state"

$SupervisorOut = Join-Path $OutDir "gh-queue-supervisor.out.log"
$SupervisorErr = Join-Path $OutDir "gh-queue-supervisor.err.log"
$LockPath      = Join-Path $OutDir "gh-queue-supervisor.lock"

$AutohealPath  = Join-Path $AiDir "fix-gh-queue-autoheal.ps1"
$WorkerPath    = Join-Path $AiDir "github-queue-worker.ps1"

$AutohealOut   = Join-Path $OutDir "gh-queue-autoheal.out.log"
$AutohealErr   = Join-Path $OutDir "gh-queue-autoheal.err.log"
$WorkerOut     = Join-Path $OutDir "gh-queue-worker.out.log"
$WorkerErr     = Join-Path $OutDir "gh-queue-worker.err.log"

New-Item -ItemType Directory -Force -Path $OutDir   | Out-Null
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$script:LockStream = $null

function Write-Log {
  param([string]$Message, [ValidateSet("OUT","ERR")][string]$Stream = "OUT")
  $ts = (Get-Date).ToString("s")
  $line = "[${ts}] $Message"
  if ($Stream -eq "ERR") {
    Add-Content -Encoding UTF8 -Path $SupervisorErr -Value $line
  } else {
    Add-Content -Encoding UTF8 -Path $SupervisorOut -Value $line
  }
}

function Test-PidAlive {
  param([int]$Pid)
  try { Get-Process -Id $Pid -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

function Acquire-Lock {
  function Read-LockPid {
    if (-not (Test-Path $LockPath)) { return 0 }
    try {
      $raw = Get-Content -Raw -Path $LockPath -ErrorAction Stop
      if ($raw.Trim().Length -eq 0) { return 0 }
      $obj = $raw | ConvertFrom-Json -ErrorAction Stop
      return [int]$obj.pid
    } catch { return 0 }
  }

  $attempts = 0
  while ($attempts -lt 6) {
    $attempts++
    try {
      $fs = New-Object System.IO.FileStream(
        $LockPath,
        [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None
      )

      $payloadObj = [pscustomobject]@{
        pid         = $PID
        startedAt   = (Get-Date).ToString("s")
        host        = $env:COMPUTERNAME
        projectRoot = $ProjectRoot
      }
      $payload = $payloadObj | ConvertTo-Json -Depth 4

      $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
      $fs.SetLength(0)
      $fs.Write($bytes, 0, $bytes.Length)
      $fs.Flush()

      $script:LockStream = $fs
      Write-Log "LOCK acquired (pid=$PID): $LockPath" "OUT"
      return
    } catch {
      $pidInLock = Read-LockPid
      if ($pidInLock -gt 0 -and (Test-PidAlive -Pid $pidInLock)) {
        Write-Log "LOCKED: instance already running (pid=$pidInLock). Exiting." "ERR"
        exit 2
      }

      try {
        Remove-Item -Force $LockPath -ErrorAction SilentlyContinue
        Write-Log "LOCK stale/unreadable -> removed; retrying (attempt=$attempts)" "OUT"
      } catch {
        Write-Log "LOCK busy but pid not alive; could not remove; retrying (attempt=$attempts)" "ERR"
      }

      Start-Sleep -Milliseconds 250
    }
  }

  Write-Log "LOCK acquire failed after retries: $LockPath" "ERR"
  exit 3
}

function Release-Lock {
  try {
    if ($null -ne $script:LockStream) {
      $script:LockStream.Dispose()
      $script:LockStream = $null
    }
  } catch {}

  try { Remove-Item -Force $LockPath -ErrorAction SilentlyContinue } catch {}
  Write-Log "LOCK released: $LockPath" "OUT"
}

function Invoke-PwshFile {
  param(
    [Parameter(Mandatory=$true)][string]$ScriptPath,
    [string[]]$Args = @(),
    [string]$StdOutPath,
    [string]$StdErrPath
  )

  if (-not (Test-Path $ScriptPath)) {
    Write-Log "MISSING: $ScriptPath" "ERR"
    return 1
  }

  $argList = @("-NoProfile","-ExecutionPolicy","Bypass","-File",$ScriptPath)
  if ($Args -and $Args.Count -gt 0) { $argList += $Args }

  $p = Start-Process -FilePath "pwsh" -WorkingDirectory $ProjectRoot -ArgumentList $argList `
    -PassThru -NoNewWindow -Wait -RedirectStandardOutput $StdOutPath -RedirectStandardError $StdErrPath

  return $p.ExitCode
}

try {
  Acquire-Lock
  Write-Log "START supervisor | root=$ProjectRoot | loop=$LoopSeconds | fast=$Fast" "OUT"

  while ($true) {
    $autohealArgs = @("-ProjectRoot", $ProjectRoot, "-SmokeSeconds", "4")
    if ($Fast) { $autohealArgs += @("-Fast") }

    Write-Log "AUTOHEAL begin" "OUT"
    $autohealExit = Invoke-PwshFile -ScriptPath $AutohealPath -Args $autohealArgs -StdOutPath $AutohealOut -StdErrPath $AutohealErr
    if ($autohealExit -ne 0) { Write-Log "AUTOHEAL exit=$autohealExit" "ERR" } else { Write-Log "AUTOHEAL ok" "OUT" }

    $workerArgs = @("-ProjectRoot", $ProjectRoot, "-LoopSeconds", "30")
    if ($Fast) { $workerArgs += @("-Fast") }

    Write-Log "WORKER start" "OUT"
    $workerExit = Invoke-PwshFile -ScriptPath $WorkerPath -Args $workerArgs -StdOutPath $WorkerOut -StdErrPath $WorkerErr
    if ($workerExit -ne 0) { Write-Log "WORKER exit=$workerExit" "ERR" } else { Write-Log "WORKER ok" "OUT" }

    Start-Sleep -Seconds $LoopSeconds
  }
} catch {
  Write-Log ("FATAL: " + $_.Exception.Message) "ERR"
  throw
} finally {
  Release-Lock
}
