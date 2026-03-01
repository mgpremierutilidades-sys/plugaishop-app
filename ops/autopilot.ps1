# PATH: ops/autopilot.ps1
param(
  [string]$Repo = "E:\plugaishop-app",
  [int]$SleepSeconds = 2,

  # Ordem automática de execução (default: Rodada 1)
  [string[]]$RunTickets = @("TICK-0101","TICK-0102","TICK-0103"),

  # Se true, requeue sempre que iniciar (mesmo se estiver "done")
  [bool]$ForceRequeueOnStart = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (!(Test-Path -LiteralPath $Repo)) { throw "Repo path not found: $Repo" }
[System.IO.Directory]::SetCurrentDirectory($Repo)

$logs = Join-Path $Repo "ops\logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

# ---------- Supervisor log (safe: not redirected child logs) ----------
function Write-SupervisorLog([string]$msg) {
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $super = Join-Path $logs "supervisor.log"
  Add-Content -Path $super -Encoding UTF8 -Value "[$ts] $msg"
}

# ---------- Single-instance lock (with stale lock recovery) ----------
$lockPath = Join-Path $logs "autopilot.lock"

function Test-ProcessExists([int]$ProcessId) {
  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

if (Test-Path -LiteralPath $lockPath) {
  $existingRaw = $null
  try { $existingRaw = Get-Content -LiteralPath $lockPath -Raw -ErrorAction SilentlyContinue } catch {}

  $existingPid = $null
  try {
    if ($existingRaw) {
      $obj = $existingRaw | ConvertFrom-Json -ErrorAction Stop
      if ($obj -and $obj.pid) { $existingPid = [int]$obj.pid }
    }
  } catch {}

  if ($existingPid -and (Test-ProcessExists -ProcessId $existingPid)) {
    throw "autopilot already running (lock exists): $lockPath`n$existingRaw"
  }

  # Stale lock: remove and continue
  try { Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue } catch {}
  Write-SupervisorLog "Stale lock removed: $lockPath"
}

$lockPayload = @{
  pid = $PID
  started_utc = (Get-Date).ToUniversalTime().ToString("s") + "Z"
  repo = $Repo
  host = $env:COMPUTERNAME
} | ConvertTo-Json -Depth 5
Set-Content -LiteralPath $lockPath -Encoding UTF8 -Value $lockPayload -Force

# ---------- Ctrl+C graceful stop ----------
$script:StopRequested = $false
$script:CancelHandler = [ConsoleCancelEventHandler]{
  param($source, $cancelEvent)
  $cancelEvent.Cancel = $true
  $script:StopRequested = $true
}
[Console]::add_CancelKeyPress($script:CancelHandler)

# ---------- Process helpers ----------
function Stop-ProcessTree([int]$ProcessId) {
  try { taskkill /PID $ProcessId /T /F | Out-Null } catch {}
}

function Stop-ProcessOnPort([int]$Port) {
  $lines = netstat -ano | findstr ":$Port"
  if (-not $lines) { return }
  $pids = @()
  foreach ($l in $lines) {
    $parts = ($l -split "\s+") | Where-Object { $_ -ne "" }
    if ($parts.Length -ge 5) { $pids += $parts[-1] }
  }
  $pids | Select-Object -Unique | ForEach-Object {
    if ($_ -match '^\d+$') { Stop-ProcessTree ([int]$_) }
  }
}

function Get-LanIPv4 {
  $ip = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, ifIndex |
    Select-Object -First 1 |
    ForEach-Object {
      (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $_.ifIndex -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notmatch '^169\.254\.' } |
        Select-Object -First 1
      ).IPAddress
    })

  if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notmatch '^169\.254\.' } |
      Select-Object -First 1
    ).IPAddress
  }
  return $ip
}

# ---------- Backlog YAML minimal parser/writer ----------
function Get-BacklogItems([string]$yamlPath) {
  if (!(Test-Path -LiteralPath $yamlPath)) { return [object[]]@() }

  $lines = Get-Content -LiteralPath $yamlPath -Encoding UTF8
  $items = New-Object System.Collections.Generic.List[object]
  $cur = $null
  $listMode = ""

  foreach ($raw in $lines) {
    $line = $raw.TrimEnd()
    if ($line.Trim().Length -eq 0) { continue }

    if ($line -match '^\-\s+id:\s*(.+)$') {
      if ($cur) { [void]$items.Add($cur) }
      $cur = [ordered]@{
        id = ($Matches[1].Trim().Trim('"').Trim("'"))
        area = ""
        title = ""
        target_files = @()
        flag = ""
        metrics = @()
        status = ""
        risk = ""
      }
      $listMode = ""
      continue
    }

    if (-not $cur) { continue }

    if ($line -match '^\s*target_files:\s*$') { $listMode="target_files"; continue }
    if ($line -match '^\s*metrics:\s*$')      { $listMode="metrics"; continue }

    if ($listMode -ne "" -and $line -match '^\s*-\s*(.+)$') {
      $v = $Matches[1].Trim().Trim('"').Trim("'")
      if ($listMode -eq "target_files") { $cur.target_files += $v }
      if ($listMode -eq "metrics")      { $cur.metrics += $v }
      continue
    }

    if ($line -match '^\s*area:\s*(.+)$')   { $cur.area   = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*title:\s*(.+)$')  { $cur.title  = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*flag:\s*(.+)$')   { $cur.flag   = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*status:\s*(.+)$') { $cur.status = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*risk:\s*(.+)$')   { $cur.risk   = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
  }

  if ($cur) { [void]$items.Add($cur) }
  return [object[]]$items.ToArray()
}

function Write-BacklogItemsAtomic([string]$yamlPath, [object[]]$items) {
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($it in $items) {
    $out.Add("- id: $($it.id)")
    if ($it.area)  { $out.Add("  area: $($it.area)") }
    if ($it.title) { $out.Add("  title: `"$($it.title)`"") }
    $out.Add("  target_files:")
    foreach ($f in @($it.target_files)) { $out.Add("    - $f") }
    if ($null -ne $it.flag) { $out.Add("  flag: $($it.flag)") }
    $out.Add("  metrics:")
    foreach ($m in @($it.metrics)) { $out.Add("    - $m") }
    $out.Add("  status: $($it.status)")
    if ($it.risk) { $out.Add("  risk: $($it.risk)") }
    $out.Add("")
  }

  $tmp = "$yamlPath.tmp"
  $out | Out-File -FilePath $tmp -Encoding UTF8 -Force
  Move-Item -LiteralPath $tmp -Destination $yamlPath -Force
}

# PSUseApprovedVerbs: use Set-* instead of Ensure-*
function Set-TicketsQueuedInOrder([string]$yamlPath, [string[]]$ticketIds, [bool]$forceRequeue) {
  $items = Get-BacklogItems $yamlPath
  if (-not $items -or $items.Count -eq 0) {
    Write-SupervisorLog "Backlog file missing or empty: $yamlPath (nothing to queue)"
    return
  }

  # Map by id
  $map = @{}
  foreach ($it in $items) {
    if ($it.id) { $map[$it.id.ToString()] = $it }
  }

  $missing = @()

  foreach ($id in $ticketIds) {
    if (-not $map.ContainsKey($id)) { $missing += $id; continue }

    $st = ($map[$id].status + "")

    if ($forceRequeue) {
      $map[$id].status = "queued"
    } else {
      if ($st -ne "queued") { $map[$id].status = "queued" }
    }
  }

  # Reorder: tickets first in specified order, rest keep original order minus those
  $ordered = New-Object System.Collections.Generic.List[object]
  foreach ($id in $ticketIds) {
    if ($map.ContainsKey($id)) { [void]$ordered.Add($map[$id]) }
  }
  foreach ($it in $items) {
    if ($ticketIds -contains ($it.id + "")) { continue }
    [void]$ordered.Add($it)
  }

  Write-BacklogItemsAtomic -yamlPath $yamlPath -items ([object[]]$ordered.ToArray())

  if ($missing.Count -gt 0) {
    Write-SupervisorLog ("WARNING: Tickets not found in backlog.queue.yml: " + ($missing -join ", "))
  } else {
    Write-SupervisorLog ("Queued tickets in order: " + ($ticketIds -join " -> "))
  }
}

try {
  # ---------- Envs for all children ----------
  $env:AUTONOMY_MODE    = "execute"
  $env:AUTONOMY_TRIGGER = "manual"

  # ---------- Auto requeue tickets (Round 1) ----------
  $backlogPath = Join-Path $Repo "ops\backlog.queue.yml"
  if ($RunTickets -and $RunTickets.Count -gt 0) {
    Set-TicketsQueuedInOrder -yamlPath $backlogPath -ticketIds $RunTickets -forceRequeue:$ForceRequeueOnStart
  }

  # ---------- Expo ----------
  $expoCmd = "npx expo start --go --lan --clear --port 0"

  # ---------- Autonomy loop cmd (single source of truth) ----------
  $tmpCmd = Join-Path $Repo "ops\_autonomy_loop.cmd"
  $autonomyLoop = @"
@echo off
setlocal enableextensions
cd /d "$Repo"
set "AUTONOMY_MODE=execute"
set "AUTONOMY_TRIGGER=manual"
:loop
npm run autonomy
timeout /t $SleepSeconds /nobreak >nul
goto loop
"@
  Set-Content -Path $tmpCmd -Value $autonomyLoop -Encoding ASCII -Force

  while (-not $script:StopRequested) {
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"

    # Child process logs (DO NOT write to these after start; Windows can lock)
    $expoOut = Join-Path $logs "expo-$ts.out.log"
    $expoErr = Join-Path $logs "expo-$ts.err.log"
    $autOut  = Join-Path $logs "autonomy-$ts.out.log"
    $autErr  = Join-Path $logs "autonomy-$ts.err.log"

    $urlFile = Join-Path $Repo "ops\expo.url.txt"
    $qrFile  = Join-Path $Repo "ops\expo.qr.txt"

    New-Item -ItemType File -Force -Path $expoOut, $expoErr, $autOut, $autErr, $urlFile, $qrFile | Out-Null
    Set-Content -Path $expoOut -Encoding UTF8 -Value "[$ts] $expoCmd"
    Set-Content -Path $autOut  -Encoding UTF8 -Value "[$ts] npm run autonomy (loop) via $tmpCmd"

    # Clean common ports
    Stop-ProcessOnPort 8081
    Stop-ProcessOnPort 8082
    Stop-ProcessOnPort 19000
    Stop-ProcessOnPort 19001

    Write-SupervisorLog "Starting Expo + Autonomy loop..."

    $expo = Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c", $expoCmd `
      -WorkingDirectory $Repo `
      -RedirectStandardOutput $expoOut `
      -RedirectStandardError $expoErr `
      -NoNewWindow -PassThru

    $autonomy = Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c", "`"$tmpCmd`"" `
      -WorkingDirectory $Repo `
      -RedirectStandardOutput $autOut `
      -RedirectStandardError $autErr `
      -NoNewWindow -PassThru

    # Infer Expo port
    $port = $null
    $deadline = (Get-Date).AddSeconds(60)
    while (-not $port -and (Get-Date) -lt $deadline -and -not $script:StopRequested) {
      Start-Sleep -Seconds 1
      try {
        $txt = Get-Content -LiteralPath $expoOut -Raw -ErrorAction SilentlyContinue
        if ($txt -match "http://localhost:(\d+)") { $port = [int]$Matches[1] }
        elseif ($txt -match "http://127\.0\.0\.1:(\d+)") { $port = [int]$Matches[1] }
        elseif ($txt -match "localhost:(\d+)") { $port = [int]$Matches[1] }
        elseif ($txt -match "127\.0\.0\.1:(\d+)") { $port = [int]$Matches[1] }
      } catch {}
    }

    $ip = Get-LanIPv4
    if ($ip -and $port) {
      $expUrl = "exp://$ip`:$port"
      Set-Content -Path $urlFile -Value $expUrl -Encoding UTF8
      try {
        cmd.exe /c "npx qrcode-terminal `"$expUrl`" > `"$qrFile`""
        Write-SupervisorLog "Expo URL: $expUrl (QR written to ops\expo.qr.txt)"
      } catch {
        Write-SupervisorLog ("QR generation failed: " + $_.Exception.Message)
      }
    } else {
      Write-SupervisorLog ("Could not infer LAN URL (ip=$ip port=$port). Check $expoOut")
    }

    # Watchdog
    while (-not $script:StopRequested) {
      Start-Sleep -Seconds $SleepSeconds

      if ($expo.HasExited) {
        Write-SupervisorLog "expo exited (code=$($expo.ExitCode)). restarting ALL..."
        if ($autonomy -and -not $autonomy.HasExited) { Stop-ProcessTree $autonomy.Id }
        break
      }

      if ($autonomy.HasExited) {
        Write-SupervisorLog "autonomy exited (code=$($autonomy.ExitCode)). restarting autonomy only..."
        $autonomy = Start-Process -FilePath "cmd.exe" `
          -ArgumentList "/c", "`"$tmpCmd`"" `
          -WorkingDirectory $Repo `
          -RedirectStandardOutput $autOut `
          -RedirectStandardError $autErr `
          -NoNewWindow -PassThru
      }
    }

    # stop requested => tear down children
    if ($script:StopRequested) {
      Write-SupervisorLog "Stop requested. Shutting down child processes..."
      try { if ($autonomy -and -not $autonomy.HasExited) { Stop-ProcessTree $autonomy.Id } } catch {}
      try { if ($expo -and -not $expo.HasExited) { Stop-ProcessTree $expo.Id } } catch {}
      break
    }
  }
}
finally {
  try { [Console]::remove_CancelKeyPress($script:CancelHandler) } catch {}
  try { Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue } catch {}
  Write-SupervisorLog "autopilot stopped."
}