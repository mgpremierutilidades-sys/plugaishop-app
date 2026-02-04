Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Repo = "C:\plugaishop-app"
$OutDir = Join-Path $Repo "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$log = Join-Path $OutDir "task-15min.log"
$ts  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Encoding UTF8 -LiteralPath $log -Value "`n===== RUN $ts ====="

try {
  if (!(Test-Path -LiteralPath $Repo)) { throw "Missing repo path: $Repo" }
  Set-Location $Repo

  $runPath = Join-Path $Repo "scripts\ai\_autoflow\run.ps1"
  if (!(Test-Path -LiteralPath $runPath)) { throw "Missing run.ps1: $runPath" }

  # Executa powershell.exe de forma "parser-safe" e "NativeCommandError-safe"
  # (captura stdout/stderr como arquivos, sem redirecionadores inline).
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

  # Anexa outputs ao log (mantém evidência do que aconteceu)
  if (Test-Path -LiteralPath $tmpOut) {
    Add-Content -Encoding UTF8 -LiteralPath $log -Value (Get-Content -LiteralPath $tmpOut -Raw)
  }
  if (Test-Path -LiteralPath $tmpErr) {
    Add-Content -Encoding UTF8 -LiteralPath $log -Value (Get-Content -LiteralPath $tmpErr -Raw)
  }

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
  # limpeza best-effort
  $tmpOut = Join-Path $OutDir "autoflow.stdout.tmp"
  $tmpErr = Join-Path $OutDir "autoflow.stderr.tmp"
  Remove-Item -Force -ErrorAction SilentlyContinue $tmpOut, $tmpErr
}
