param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("pre-commit", "manual")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

function Write-Status {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[hooks/$Mode] $Message"
}

function Stop-Checks {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Error "[hooks/$Mode] $Message"
  exit 1
}

function Test-ProhibitedStagedFiles {
  # Retorna a lista de arquivos proibidos que estão no staging (se houver)
  $staged = git diff --cached --name-only
  if (-not $staged) { return @() }

  $blockedPatterns = @(
    '(^|/)_bundle_files[^/]*\.txt$',
    '(^|/)PATCH_INPUT[^/]*\.txt$'
  )

  $hits = @()
  foreach ($p in $blockedPatterns) {
    $hits += ($staged | Where-Object { $_ -match $p })
  }

  return ($hits | Sort-Object -Unique)
}

try {
  $repoRoot = git rev-parse --show-toplevel 2>$null
  if (-not $repoRoot) { Stop-Checks "Não consegui detectar a raiz do git (rev-parse falhou)." }

  Set-Location $repoRoot
  [System.Environment]::CurrentDirectory = (Get-Location).Path
} catch {
  Stop-Checks "Git não disponível ou não é um repositório. Detalhe: $($_.Exception.Message)"
}

# Enforcement antes do resto
$blocked = Test-ProhibitedStagedFiles
if ($blocked.Count -gt 0) {
  $list = ($blocked -join "`n - ")
  Stop-Checks @"
Arquivos proibidos no commit (artefatos locais):
 - $list

Diretriz:
- NÃO versionar manifests de bundle / inputs de patch.
- Mova para "_share/_bundles/" ou apague, e remova do staging:

  git restore --staged _bundle_files*.txt PATCH_INPUT*.txt

Se for um caso excepcional e deliberado, registre decisão e use outro nome/caminho aprovado (ex.: docs/decisions/...) — mas isso NÃO é o padrão.
"@
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Stop-Checks "Node não encontrado no PATH." }

$guardPrimary = "scripts/hooks/check-opacity-guards.mjs"
$guardFallback = "scripts/hooks/opacity-guardrails.mjs"

$guardFile = if (Test-Path $guardPrimary) { $guardPrimary } elseif (Test-Path $guardFallback) { $guardFallback } else { $null }
if (-not $guardFile) { Stop-Checks "Arquivo do guard não encontrado ($guardPrimary / $guardFallback)." }

Write-Status "Rodando Opacity Guardrails ($guardFile)..."
& node $guardFile
$code = $LASTEXITCODE

if ($code -ne 0) {
  Stop-Checks "Opacity Guardrails falhou (exit code $code). Corrija antes de commitar/push."
}

Write-Status "OK"
exit 0
