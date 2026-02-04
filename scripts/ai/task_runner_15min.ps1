Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Repo = "C:\plugaishop-app"
$OutDir = Join-Path $Repo "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$log = Join-Path $OutDir "task-15min.log"
$ts  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Encoding UTF8 -LiteralPath $log -Value "`n===== RUN $ts ====="

function Append-File([string]$path) {
  if (Test-Path -LiteralPath $path) {
    Add-Content -Encoding UTF8 -LiteralPath $log -Value (Get-Content -LiteralPath $path -Raw)
  }
}

try {
  if (!(Test-Path -LiteralPath $Repo)) { throw "Missing repo path: $Repo" }
  Set-Location $Repo

  $runPath = Join-Path $Repo "scripts\ai\_autoflow\run.ps1"
  if (!(Test-Path -LiteralPath $runPath)) { throw "Missing run.ps1: $runPath" }

  $tmpOut = Join-Path $OutDir "autoflow.stdout.tmp"
  $tmpErr = Join-Path $OutDir "autoflow.stderr.tmp"
  Remove-Item -Force -ErrorAction SilentlyContinue $tmpOut, $tmpErr

  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $runPath,
    "-Mode", "verify",
    "-AutoCommit", "1",
    "-AutoPush", "1"
  )

  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner] exec: powershell.exe " + ($args -join " "))

  $p = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList $args `
    -NoNewWindow `
    -Wait `
    -PassThru `
    -RedirectStandardOutput $tmpOut `
    -RedirectStandardError  $tmpErr

  Append-File $tmpOut
  Append-File $tmpErr

  $code = $p.ExitCode
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner] exitcode=" + $code)
  exit $code
}
catch {
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner][ERROR] " + $_.Exception.Message)
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ($_.ScriptStackTrace)
  exit 1
}
finally {
  $tmpOut = Join-Path $OutDir "autoflow.stdout.tmp"
  $tmpErr = Join-Path $OutDir "autoflow.stderr.tmp"
  Remove-Item -Force -ErrorAction SilentlyContinue $tmpOut, $tmpErr
}
