# Cria estrutura no D:\ e copia diretrizes do repo para lá (sem symlink obrigatório).
# Execute no PowerShell (pode ser normal; Admin só se você for criar links depois).

param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$TargetRoot = "D:\PLUGAISHOP_2026\DIRETRIZES_MESTRAS"
)

Write-Host "RepoRoot: $RepoRoot"
Write-Host "TargetRoot: $TargetRoot"

New-Item -Path $TargetRoot -ItemType Directory -Force | Out-Null

$sub = @(
  "PROJETO_PLUGAISHOP_2026",
  "PROJETO_MAXXIMUS",
  "INTERSECAO_DIRETRIZES",
  "CONSULTA_RAPIDA"
)

foreach ($s in $sub) {
  New-Item -Path (Join-Path $TargetRoot $s) -ItemType Directory -Force | Out-Null
}

$src = Join-Path $RepoRoot "docs\diretrizes"
if (!(Test-Path $src)) {
  Write-Host "ERRO: Não achei $src. Rode este script na raiz do repo."
  exit 1
}

# Copia (espelhamento simples)
Copy-Item -Path (Join-Path $src "*") -Destination $TargetRoot -Recurse -Force

Write-Host "OK: Diretrizes copiadas para $TargetRoot"
Write-Host "Dica: se quiser linkar depois: mklink /D docs\diretrizes_link D:\PLUGAISHOP_2026\DIRETRIZES_MESTRAS"
