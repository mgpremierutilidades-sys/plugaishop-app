param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("pre-commit", "manual")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Error "[hooks/$Mode] $Message"
  exit 1
}

function Info([string]$Message) {
  Write-Host "[hooks/$Mode] $Message"
}

try {
  $repoRoot = git rev-parse --show-toplevel 2>$null
  if (-not $repoRoot) { Fail "Não consegui detectar a raiz do git (rev-parse falhou)." }
  Set-Location $repoRoot
  [System.Environment]::CurrentDirectory = (Get-Location).Path
} catch {
  Fail "Git não disponível ou não é um repositório. Detalhe: $($_.Exception.Message)"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail "Node não encontrado no PATH." }

$guardPrimary = "scripts/hooks/check-opacity-guards.mjs"
$guardFallback = "scripts/hooks/opacity-guardrails.mjs"

$guardFile = if (Test-Path $guardPrimary) { $guardPrimary } elseif (Test-Path $guardFallback) { $guardFallback } else { $null }
if (-not $guardFile) { Fail "Arquivo do guard não encontrado ($guardPrimary / $guardFallback)." }

Info "Rodando Opacity Guardrails ($guardFile)..."
node $guardFile

Info "OK"
exit 0
