$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$expoDir = Join-Path $root "node_modules\expo"
$outFile = Join-Path $root "tsconfig.expo-base.json"

Write-Host "== Fix Expo tsconfig (Windows) =="
Write-Host "Project root: $root"
Write-Host "Expo dir:     $expoDir"
Write-Host "Output file:  $outFile"
Write-Host ""

if (!(Test-Path $expoDir)) {
  Write-Host "ERRO: node_modules\expo não encontrado."
  Write-Host "Rode: npm install"
  exit 1
}

# Procurar qualquer arquivo tsconfig.base* (json ou sem extensão)
$baseCandidates = Get-ChildItem -Path $expoDir -Filter "tsconfig.base*" -File -ErrorAction SilentlyContinue

if ($null -eq $baseCandidates -or $baseCandidates.Count -eq 0) {
  Write-Host "ERRO: não achei tsconfig.base* em node_modules\expo."
  Write-Host "Tente: apagar node_modules e rodar npm install"
  exit 1
}

# Preferir tsconfig.base.json se existir
$preferred = $baseCandidates | Where-Object { $_.Name -eq "tsconfig.base.json" } | Select-Object -First 1
if ($null -eq $preferred) {
  $preferred = $baseCandidates | Select-Object -First 1
}

Write-Host "Usando base: $($preferred.FullName)"

# Copiar conteúdo para arquivo local
$content = Get-Content -Raw -Path $preferred.FullName -Encoding UTF8
Set-Content -Path $outFile -Value $content -Encoding UTF8

Write-Host "OK: tsconfig.expo-base.json atualizado."
Write-Host "Agora reinicie o TypeScript do VS Code: Ctrl+Shift+P -> 'TypeScript: Restart TS server'"
