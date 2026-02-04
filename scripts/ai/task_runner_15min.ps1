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

  # IMPORTANT:
  # Em alguns ambientes, stderr de comando nativo vira ErrorRecord e, com EAP=Stop, vira exceção.
  # Isso é exatamente o caso de "Everything up-to-date".
  $prevEap = $ErrorActionPreference
  $prevNative = $null

  # PowerShell 7+ possui PSNativeCommandUseErrorActionPreference; Windows PowerShell normalmente não.
  if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
    $prevNative = $global:PSNativeCommandUseErrorActionPreference
    $global:PSNativeCommandUseErrorActionPreference = $false
  }

  $ErrorActionPreference = "Continue"
  try {
    # stdout+stderr -> log
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runPath -Mode verify -AutoCommit 1 -AutoPush 1 2>&1 |
      Out-File -Encoding utf8 -Append -FilePath $log
  }
  finally {
    $ErrorActionPreference = $prevEap
    if ($null -ne $prevNative) { $global:PSNativeCommandUseErrorActionPreference = $prevNative }
  }

  $code = $LASTEXITCODE
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner] exitcode=" + $code)
  exit $code
}
catch {
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ("[runner][ERROR] " + $_.Exception.Message)
  Add-Content -Encoding UTF8 -LiteralPath $log -Value ($_.ScriptStackTrace)
  exit 1
}
