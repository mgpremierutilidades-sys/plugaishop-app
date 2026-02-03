# scripts/ai/run_ai_patch.ps1
# Um comando: bootstrap -> (opcional) fix mojibake -> apply -> resumo git
# PowerShell 5.1-safe

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$bootstrap = Join-Path $repoRoot "scripts\ai\bootstrap_patch_repo.ps1"
$patchRepo = Join-Path $repoRoot "scripts\ai\patch_repo.py"

Write-Host "[run] repoRoot: $repoRoot"

if (-not (Test-Path $bootstrap)) {
  throw "[run] bootstrap não encontrado: $bootstrap"
}

# 1) Bootstrap
Write-Host "[run] bootstrap..."
powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrap

if (-not (Test-Path $patchRepo)) {
  throw "[run] patch_repo.py não encontrado após bootstrap: $patchRepo"
}

# 2) Validar Python
Write-Host "[run] py_compile..."
python -m py_compile $patchRepo
if ($LASTEXITCODE -ne 0) { throw "[run] py_compile failed" }

# 3) Apply (opcional: se no futuro você reintroduzir --fix-mojibake no patch_repo.py, é só descomentar)
# Write-Host "[run] fix mojibake..."
# python $patchRepo --fix-mojibake

Write-Host "[run] apply..."
python $patchRepo --apply
if ($LASTEXITCODE -ne 0) { throw "[run] apply failed" }

# 4) Resumo Git
Write-Host ""
Write-Host "[run] git diff --stat"
git diff --stat

Write-Host ""
Write-Host "[run] git status -sb"
git status -sb

Write-Host ""
Write-Host "[run] done."
