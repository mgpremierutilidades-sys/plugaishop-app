@"
# scripts/ai/run_ai_patch.ps1
# 1 comando: bootstrap -> apply -> git resumo (PS 5.1-safe)

`$ErrorActionPreference = "Stop"

`$repoRoot = Resolve-Path (Join-Path `$PSScriptRoot "..\..")
Set-Location `$repoRoot

`$bootstrap = Join-Path `$repoRoot "scripts\ai\bootstrap_patch_repo.ps1"
`$patchRepo = Join-Path `$repoRoot "scripts\ai\patch_repo.py"

Write-Host "[run] repoRoot: `$repoRoot"

Write-Host "[run] bootstrap..."
powershell -NoProfile -ExecutionPolicy Bypass -File `$bootstrap

Write-Host "[run] py_compile..."
python -m py_compile `$patchRepo
if (`$LASTEXITCODE -ne 0) { throw "[run] py_compile failed" }

Write-Host "[run] apply..."
python `$patchRepo --apply
if (`$LASTEXITCODE -ne 0) { throw "[run] apply failed" }

Write-Host ""
Write-Host "[run] git diff --stat"
git diff --stat

Write-Host ""
Write-Host "[run] git status -sb"
git status -sb

Write-Host ""
Write-Host "[run] done."
"@ | Set-Content -LiteralPath .\scripts\ai\run_ai_patch.ps1 -Encoding utf8
