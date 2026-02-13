param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 20,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

function Ensure-Dir([string]$p){ if(!(Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function NowStamp(){ (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") }
function Log([string]$msg){
  $line = ("[" + (NowStamp) + "] " + $msg)
  Write-Host $line
  $line | Out-File -FilePath $script:LogPath -Append -Encoding UTF8
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

$aiDir   = Join-Path $ProjectRoot "scripts\ai"
$inDir   = Join-Path $aiDir "_in"
$stateDir= Join-Path $aiDir "_state"
Ensure-Dir $inDir
Ensure-Dir $stateDir

$script:PidPath  = Join-Path $stateDir "autopilot.pid"
$script:LockPath = Join-Path $stateDir "autopilot.lock"
$script:LogPath  = Join-Path $stateDir "autopilot.log"

# Single-instance lock (best effort)
try {
  if (Test-Path $script:LockPath) {
    $age = (Get-Item $script:LockPath).LastWriteTime
    # Se lock muito antigo, assume morto
    if ((New-TimeSpan -Start $age -End (Get-Date)).TotalMinutes -lt 120) {
      Log "Lock exists and is recent. Exiting to avoid double instance."
      exit 0
    }
  }
  Set-Content -Path $script:LockPath -Value ("lock=" + (NowStamp)) -Encoding UTF8
} catch {}

# Write PID
try { Set-Content -Path $script:PidPath -Value $PID -Encoding UTF8 } catch {}

Log "AUTOPILOT ON"
Log ("ProjectRoot=" + $ProjectRoot)
Log ("InDir=" + $inDir)
Log ("LoopSeconds=" + $LoopSeconds)
Log ("Fast=" + $Fast.IsPresent)

$aiPs1 = Join-Path $ProjectRoot "ai.ps1"
if (!(Test-Path $aiPs1)) {
  Log ("ERROR: ai.ps1 not found at " + $aiPs1)
  exit 2
}

while ($true) {
  try {
    # Heartbeat
    try { Set-Content -Path $script:LockPath -Value ("lock=" + (NowStamp)) -Encoding UTF8 } catch {}

    $pending = Get-ChildItem -Path $inDir -Filter "patch_*.ps1" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime

    foreach ($p in $pending) {
      $done = Join-Path $inDir ($p.BaseName + ".applied")
      if (Test-Path $done) { continue }

      Log ("Applying: " + $p.FullName)

      # Apply via ai.ps1 (rollback is inside run_ai_patch.ps1)
      if ($Fast) {
        pwsh -NoProfile -ExecutionPolicy Bypass -File $aiPs1 -Mode apply -PatchFile $p.FullName -Fast | Out-Null
      } else {
        pwsh -NoProfile -ExecutionPolicy Bypass -File $aiPs1 -Mode apply -PatchFile $p.FullName | Out-Null
      }

      # Mark applied
      Set-Content -Encoding UTF8 -Path $done -Value ("applied_at=" + (NowStamp))
      Log ("Applied OK: " + $p.Name)
    }
  } catch {
    Log ("ERROR: " + $_.Exception.Message)
  }

  Start-Sleep -Seconds $LoopSeconds
}
