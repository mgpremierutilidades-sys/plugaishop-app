param(
  [string]$Repo = "E:\plugaishop-app",
  [int]$SleepSeconds = 2
)

$ErrorActionPreference = "Stop"
$logs = Join-Path $Repo "ops\logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Kill-Tree([int]$procId) { try { taskkill /PID $procId /T /F | Out-Null } catch {} }

function Kill-Port([int]$port) {
  $lines = netstat -ano | findstr ":$port"
  if (-not $lines) { return }
  $pids = @()
  foreach ($l in $lines) {
    $parts = ($l -split "\s+") | Where-Object { $_ -ne "" }
    if ($parts.Length -ge 5) { $pids += $parts[-1] }
  }
  $pids | Select-Object -Unique | ForEach-Object {
    if ($_ -match '^\d+$') { Kill-Tree ([int]$_) }
  }
}

function Get-LanIPv4() {
  # pega IP v4 da interface que tem default route (mais confiável)
  $ip = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, ifIndex |
    Select-Object -First 1 |
    ForEach-Object { (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $_.ifIndex -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notmatch '^169\.254\.' } |
      Select-Object -First 1).IPAddress })

  if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notmatch '^169\.254\.' } |
      Select-Object -First 1).IPAddress
  }
  return $ip
}

$env:AUTONOMY_MODE = "execute"

# Expo: porta automática (evita prompt), host LAN, e target Expo Go
# --port 0 = pega primeira porta disponível. :contentReference[oaicite:1]{index=1}
$expoCmd = "npx expo start --go --lan --clear --port 0"

# Autonomy: loop infinito
$autonomyLoop = @"
cd /d $Repo
set AUTONOMY_MODE=execute
:loop
npm run autonomy
powershell -NoProfile -Command "Start-Sleep -Seconds $SleepSeconds"
goto loop
"@

while ($true) {
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"

  $expoOut = Join-Path $logs "expo-$ts.out.log"
  $expoErr = Join-Path $logs "expo-$ts.err.log"
  $autOut  = Join-Path $logs "autonomy-$ts.out.log"
  $autErr  = Join-Path $logs "autonomy-$ts.err.log"
  $urlFile = Join-Path $Repo "ops\expo.url.txt"

  New-Item -ItemType File -Force -Path $expoOut, $expoErr, $autOut, $autErr, $urlFile | Out-Null
  Add-Content -Path $expoOut -Value "[$ts] $expoCmd"
  Add-Content -Path $autOut  -Value "[$ts] npm run autonomy (loop)"

  # limpa portas comuns antes (se você deixou Metro antigo rodando)
  Kill-Port 8081
  Kill-Port 8082
  Kill-Port 19000
  Kill-Port 19001

  Write-Host "[$ts] Starting Expo + Autonomy loop..."

  $expo = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", $expoCmd `
    -WorkingDirectory $Repo `
    -RedirectStandardOutput $expoOut `
    -RedirectStandardError $expoErr `
    -NoNewWindow -PassThru

  # Autonomy loop (via cmd)
  $tmpCmd = Join-Path $Repo "ops\_autonomy_loop.cmd"
  Set-Content -Path $tmpCmd -Value $autonomyLoop -Encoding ASCII

  $autonomy = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "`"$tmpCmd`"" `
    -WorkingDirectory $Repo `
    -RedirectStandardOutput $autOut `
    -RedirectStandardError $autErr `
    -NoNewWindow -PassThru

  # Descobrir porta real pelo log (expo em modo headless geralmente loga "Waiting on http://localhost:PORT")
  $port = $null
  $deadline = (Get-Date).AddSeconds(45)

  while (-not $port -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    try {
      $txt = Get-Content $expoOut -Raw -ErrorAction SilentlyContinue
      if ($txt -match "Waiting on http://localhost:(\d+)") { $port = [int]$Matches[1] }
      elseif ($txt -match "localhost:(\d+)") { $port = [int]$Matches[1] }
    } catch {}
  }

  $ip = Get-LanIPv4
  if ($ip -and $port) {
    $expUrl = "exp://$ip`:$port"
    Set-Content -Path $urlFile -Value $expUrl -Encoding UTF8

    # QR ASCII em arquivo (usa bin que já existe em muitos setups)
    try {
      $qrFile = Join-Path $Repo "ops\expo.qr.txt"
      cmd.exe /c "npx qrcode-terminal `"$expUrl`" > `"$qrFile`""
    } catch {}
  } else {
    Add-Content -Path $expoErr -Value "[$(Get-Date -Format yyyyMMdd-HHmmss)] Could not infer LAN URL (ip=$ip port=$port)."
  }

  # Watchdog
  while ($true) {
    Start-Sleep -Seconds $SleepSeconds

    if ($expo.HasExited) {
      Add-Content -Path $expoErr -Value "[$(Get-Date -Format yyyyMMdd-HHmmss)] expo exited ($($expo.ExitCode)). restarting ALL..."
      Kill-Tree $autonomy.Id
      break
    }

    if ($autonomy.HasExited) {
      Add-Content -Path $autErr -Value "[$(Get-Date -Format yyyyMMdd-HHmmss)] autonomy exited ($($autonomy.ExitCode)). restarting autonomy only..."
      $autonomy = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "`"$tmpCmd`"" `
        -WorkingDirectory $Repo `
        -RedirectStandardOutput $autOut `
        -RedirectStandardError $autErr `
        -NoNewWindow -PassThru
    }
  }
}
