Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Repo = "C:\plugaishop-app"
$OutDir = Join-Path $Repo "scripts\ai\_out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$log = Join-Path $OutDir "task-15min.log"
$ts  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Encoding UTF8 -LiteralPath $log -Value "`n===== RUN $ts ====="

try {
  Set-Location $Repo

  $runPath = Join-Path $Repo "scripts\ai\_autoflow\run.ps1"
  if (!(Test-Path -LiteralPath $runPath)) { throw "Missing run.ps1: $runPath" }

  # stdout+stderr -> log (parser-safe)
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runPath -Mode verify -AutoCommit 1 -AutoPush 1 2>&1 |
    Out-File -Encoding utf8 -Append -FilePath $log

  $code = $LASTEXITCODE
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner] exitcode=" + $code)
  exit $code
}
catch {
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner][ERROR] " + $_.Exception.Message)
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ($_.ScriptStackTrace)
  exit 1
}
