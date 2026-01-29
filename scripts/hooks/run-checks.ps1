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
if (-not $node) { Fail "Node não encontrado no PATH. Instale Node.js (LTS) e reabra o terminal." }

$guardFile = "scripts/hooks/opacity-guardrails.mjs"
if (-not (Test-Path $guardFile)) { Fail "Arquivo não encontrado: $guardFile" }

Info "Rodando Opacity Guardrails..."
node $guardFile

Info "OK"
exit 0
