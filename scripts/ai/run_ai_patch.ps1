param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [Parameter(Mandatory=$true)]
  [string]$PatchFile,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Run-OrFail([string]$cmd) {
  Write-Host ""
  Write-Host ("$ " + $cmd)
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
}

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

Set-Location $ProjectRoot

$AiDir = Join-Path $ProjectRoot "scripts\ai"
$OutDir = Join-Path $AiDir "_out"
$StateDir = Join-Path $AiDir "_state"
Ensure-Dir $OutDir
Ensure-Dir $StateDir

if (-not (Test-Path $PatchFile)) { throw "PatchFile not found: $PatchFile" }

# Checkpoint
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ckPath = Join-Path $StateDir ("checkpoint_" + $stamp + ".json")
$state = @{
  stamp = $stamp
  branch = (git rev-parse --abbrev-ref HEAD)
  head = (git rev-parse HEAD)
}
($state | ConvertTo-Json -Depth 5) | Set-Content -Encoding UTF8 $ckPath
Write-Host ("Checkpoint: " + $ckPath)

function Rollback([string]$checkpointPath) {
  $s = Get-Content $checkpointPath -Raw | ConvertFrom-Json
  Write-Host ""
  Write-Host ("== ROLLBACK to " + $s.head + " ==")
  Run-OrFail ("git reset --hard " + $s.head)
  Run-OrFail "git clean -fd"
}

function Gates {
  Write-Host ""
  Write-Host "== Gates =="
  Run-OrFail 'npx eslint app components context hooks lib utils types constants data scripts --fix'
  Run-OrFail 'npx prettier --write app components context hooks lib utils types constants data scripts .github README.md eslint.config.js tsconfig.json package.json'
  Run-OrFail 'npx tsc -p . --noEmit'
  Write-Host "Gates OK."
}

try {
  Write-Host ""
  Write-Host ("== APPLY PATCH: " + $PatchFile + " ==")
  pwsh -NoProfile -ExecutionPolicy Bypass -File $PatchFile -ProjectRoot $ProjectRoot

  Gates

  Write-Host ""
  Write-Host "APPLY OK."
  exit 0
} catch {
  Write-Host ""
  Write-Host ("APPLY FAIL: " + $_.Exception.Message)
  Rollback $ckPath
  throw
}
