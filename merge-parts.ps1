# merge-parts.ps1
$partsDir = "_zips_parts_20260213-002002"

# Mescla todas as subpastas part_* dentro de $partsDir para a raiz
Get-ChildItem -Path $partsDir -Directory | ForEach-Object {
    $partPath = $_.FullName
    Write-Host "Mesclando $partPath …"
    # Copia recursivamente os arquivos da parte para a raiz. -Force sobrescreve arquivos existentes.
    Copy-Item -Path (Join-Path $partPath '*') -Destination . -Recurse -Force
}

# Opcional: remova as partes depois de copiar
# Remove-Item -Path $partsDir -Recurse -Force

Write-Host "Mescla concluída. O código completo do app está agora na raiz."