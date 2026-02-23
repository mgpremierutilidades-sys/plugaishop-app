# scripts/ai/run_ai_patch.ps1
# Runner único para aplicar patch (ps1) com gates + rollback.
# Mantém compatibilidade com ai.ps1 e GH Queue Worker.

param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,

  # Modo A (principal): arquivo de patch PowerShell
  [string]$PatchFile = "",

  # Modo B (opcional): executor python "target-file only" (seguro)
  [string]$Objective = "",
  [string]$TargetFile = "",

  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Run-OrFail([string]$cmd) {
  Write-Host ""
  Write-Host ("$ " + $cmd)
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
}

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

$AiDir = Join-Path $ProjectRoot "scripts\ai"
$OutDir = Join-Path $AiDir "_out"
$StateDir = Join-Path $AiDir "_state"
Ensure-Dir $OutDir
Ensure-Dir $StateDir

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
  # Lint/fix (mantém repo consistente)
  Run-OrFail 'npx eslint app components context hooks lib utils types constants data scripts --fix'
  Run-OrFail 'npx prettier --write app components context hooks lib utils types constants data scripts .github README.md eslint.config.js tsconfig.json package.json'
  Run-OrFail 'npx tsc -p . --noEmit'
  Write-Host "Gates OK."
}

try {
  if (-not [string]::IsNullOrWhiteSpace($PatchFile)) {
    if (-not (Test-Path $PatchFile)) { throw "PatchFile not found: $PatchFile" }
    Write-Host ""
    Write-Host ("== APPLY PATCH (ps1): " + $PatchFile + " ==")
    pwsh -NoProfile -ExecutionPolicy Bypass -File $PatchFile -ProjectRoot $ProjectRoot
  } elseif (-not [string]::IsNullOrWhiteSpace($TargetFile)) {
    # Executor python seguro (target-file only)
    $bootstrap = Join-Path $AiDir "bootstrap_patch_repo.ps1"
    $patchPy = Join-Path $AiDir "patch_repo_v2.py"
    if (-not (Test-Path $bootstrap)) { throw "Missing bootstrap: $bootstrap" }
    if (-not (Test-Path $patchPy)) { throw "Missing patcher: $patchPy" }

    Write-Host ""
    Write-Host ("== APPLY PATCH (python v2): target-file=" + $TargetFile + " ==")
    pwsh -NoProfile -ExecutionPolicy Bypass -File $bootstrap
    python -m py_compile $patchPy
    if ($LASTEXITCODE -ne 0) { throw "py_compile failed: $patchPy" }

    $args = @($patchPy, "--apply", "--target-file", $TargetFile)
    if (-not [string]::IsNullOrWhiteSpace($Objective)) { $args += @("--objective", $Objective) }

    python @args
    if ($LASTEXITCODE -ne 0) { throw "python patch_repo_v2 apply failed" }
  } else {
    throw "Provide -PatchFile OR -TargetFile."
  }

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
