param()

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
if (-not (Test-Path (Join-Path $Root ".git"))) {
  throw "Rode este script na raiz do repo (onde existe .git). Atual: $Root"
}

$HooksPath = ".githooks"
if (-not (Test-Path (Join-Path $Root $HooksPath))) {
  throw "Pasta '$HooksPath' não encontrada."
}

git config core.hooksPath $HooksPath | Out-Null

$val = git config --get core.hooksPath
Write-Host "OK. core.hooksPath = $val"
Write-Host "Hooks instalados. Rode este setup também no notebook (uma vez)."
