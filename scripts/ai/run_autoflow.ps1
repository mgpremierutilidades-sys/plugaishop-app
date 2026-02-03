param(
  [string]$Mode = "dry-run"
)

$ErrorActionPreference = "Stop"

Write-Host "== PLUGAISHOP AUTOFLOW =="
Write-Host "Mode: $Mode"

$env:AUTOFLOW_MODE = $Mode

# Exporta contexto (já existe no repo)
.\scripts\ai\export-context.ps1

# Análise Python (somente leitura)
python .\scripts\ai\autoflow_analyze.py

Write-Host "Autoflow finalizado (sem alterações no app)."
