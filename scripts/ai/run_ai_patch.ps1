# scripts/ai/run_ai_patch.ps1
# 1 comando: bootstrap -> apply (com alvo) -> git resumo (PS 5.1-safe)

param(
  [Parameter(Mandatory=$false)]
  [string]$Objective = "",

  [Parameter(Mandatory=$false)]
  [string]$TargetFile = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$bootstrap = Join-Path $repoRoot "scripts\ai\bootstrap_patch_repo.ps1"
$patchRepo = Join-Path $repoRoot "scripts\ai\patch_repo_v2.py"

Write-Host "[run] repoRoot: $repoRoot"
Write-Host "[run] objective: $Objective"
Write-Host "[run] targetFile: $TargetFile"

Write-Host "[run] bootstrap..."
powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrap

Write-Host "[run] py_compile..."
python -m py_compile $patchRepo
if ($LASTEXITCODE -ne 0) { throw "[run] py_compile failed" }

Write-Host "[run] apply..."
$pyArgs = @($patchRepo, "--apply")

if ($Objective -and $Objective.Trim().Length -gt 0) {
  $pyArgs += @("--objective", $Objective)
}

if ($TargetFile -and $TargetFile.Trim().Length -gt 0) {
  $pyArgs += @("--target-file", $TargetFile)
}

python @pyArgs
if ($LASTEXITCODE -ne 0) { throw "[run] apply failed" }

Write-Host ""
Write-Host "[run] git diff --stat"
git diff --stat

Write-Host ""
Write-Host "[run] git status -sb"
git status -sb

Write-Host ""
Write-Host "[run] done."
