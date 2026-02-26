<#
Repo 2 — Chat Access
Gera um bundle de contexto do repo + um prompt padronizado para colar no ChatGPT/Copilot Chat.

Requisitos:
- PowerShell 7+ recomendado (pwsh)
- scripts/ai/export-context.ps1 deve existir (já existe no repo)
- Não altera NENHUM arquivo de UI

Flag (continuidade):
- tools/maxximus-orchestrator/data/state.json
  - featureFlags.repo2-chat-access = true

Uso:
  pwsh scripts/ai/repo2-chat.ps1 -Objective "Corrigir X sem mexer no layout"
  pwsh scripts/ai/repo2-chat.ps1 -Objective "Implementar Ticket EPIC0-03" -OutDir "scripts/ai/_out"
#>

param(
  [Parameter(Mandatory=$true)]
  [string]$Objective,

  [string]$OutDir = "scripts/ai/_out",

  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Section($title) {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkGray
  Write-Host $title -ForegroundColor Cyan
  Write-Host ("=" * 72) -ForegroundColor DarkGray
}

function Resolve-RepoRoot {
  param([string]$StartPath)

  $dir = Get-Item -LiteralPath $StartPath
  if ($dir -isnot [System.IO.DirectoryInfo]) {
    $dir = $dir.Directory
  }

  while ($null -ne $dir) {
    if (Test-Path -LiteralPath (Join-Path $dir.FullName "package.json")) { return $dir.FullName }
    if (Test-Path -LiteralPath (Join-Path $dir.FullName ".git")) { return $dir.FullName }
    $dir = $dir.Parent
  }

  throw "Não foi possível resolver RepoRoot (package.json/.git não encontrados)."
}

# RepoRoot a partir do path deste script (independente do cwd)
$repoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
Set-Location $repoRoot

function Get-FlagEnabledFromState {
  param(
    [string]$FlagName,
    [string]$RepoRoot
  )

  $statePath = Join-Path $RepoRoot "tools/maxximus-orchestrator/data/state.json"
  if (!(Test-Path $statePath)) { return $false }

  try {
    $json = Get-Content $statePath -Raw | ConvertFrom-Json

    if ($null -ne $json.featureFlags) {
      if ($null -ne $json.featureFlags.$FlagName) {
        return [bool]$json.featureFlags.$FlagName
      }

      $camel = "repo2ChatAccess"
      if ($FlagName -eq "repo2-chat-access" -and $null -ne $json.featureFlags.$camel) {
        return [bool]$json.featureFlags.$camel
      }
    }

    return $false
  } catch {
    return $false
  }
}

Write-Section "Repo 2 — Chat Access (context bundle + prompt)"

$flag = "repo2-chat-access"
$enabled = Get-FlagEnabledFromState -FlagName $flag -RepoRoot $repoRoot

if (-not $enabled -and -not $Force) {
  $statePathShown = "tools/maxximus-orchestrator/data/state.json"
  Write-Host "FLAG OFF: '$flag' está desabilitada no state.json." -ForegroundColor Yellow
  Write-Host "Habilite em: $statePathShown" -ForegroundColor Yellow
  Write-Host "Adicione (ou ajuste) este trecho:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host '  "featureFlags": { "repo2-chat-access": true }' -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Ou rode com -Force para ignorar a flag (debug pontual)." -ForegroundColor Yellow
  exit 2
}

# Normalizar OutDir relativo ao repoRoot (mantém compat com argumento relativo)
if ([System.IO.Path]::IsPathRooted($OutDir)) {
  $outDirFull = $OutDir
} else {
  $outDirFull = Join-Path $repoRoot $OutDir
}

if (!(Test-Path $outDirFull)) {
  New-Item -ItemType Directory -Force -Path $outDirFull | Out-Null
}

# Bundle de contexto (reusa script existente)
$exportScript = Join-Path $repoRoot "scripts/ai/export-context.ps1"
if (!(Test-Path $exportScript)) {
  Write-Host "ERRO: script não encontrado: $exportScript" -ForegroundColor Red
  exit 1
}

Write-Host "1) Exportando contexto do repositório..." -ForegroundColor Green
pwsh $exportScript | Out-Null

$bundlePath = Join-Path $outDirFull "context-bundle.txt"
if (!(Test-Path $bundlePath)) {
  $fallback = Join-Path $repoRoot "scripts/ai/_out/context-bundle.txt"
  if (Test-Path $fallback) {
    Copy-Item $fallback $bundlePath -Force
  }
}

if (!(Test-Path $bundlePath)) {
  Write-Host "ERRO: context bundle não foi gerado em: $bundlePath" -ForegroundColor Red
  Write-Host "Verifique scripts/ai/export-context.ps1 e permissões de escrita." -ForegroundColor Red
  exit 1
}

$ticketPath = Join-Path $outDirFull "repo2-ticket.md"

Write-Host "2) Gerando ticket/prompt Repo 2..." -ForegroundColor Green

# Para colar no chat, é melhor mostrar path RELATIVO ao repo (mais portátil)
$bundlePathRel = Resolve-Path $bundlePath | ForEach-Object {
  $_.Path.Replace($repoRoot, ".").Replace("\", "/")
}

$ticket = @"
# REPO 2 — CHAT ACCESS (COLAR NO CHAT)

## OBJECTIVE
$Objective

## CONSTRAINTS (NÃO NEGOCIÁVEIS)
- Layout congelado: nenhuma mudança visual/UX/estrutura.
- Entregar sempre arquivos inteiros (sem diff parcial).
- Preferir patch mínimo incremental.
- Sem dependências novas pesadas.

## REPO CONTEXT BUNDLE
Anexar/colar o conteúdo de:
$bundlePathRel

## SAÍDA EXIGIDA
A) PLANO (3–7 passos)
B) CHECKLIST (executável)
C) ARQUIVOS NECESSÁRIOS
D) BACKLOG (flag + métricas + DoD)
E) PATCH (ARQUIVOS INTEIROS)
F) COMANDOS GIT
G) TESTES
H) RISCOS / ROLLBACK
"@

$ticket | Out-File -FilePath $ticketPath -Encoding UTF8

Write-Section "PRONTO ✅"

Write-Host "RepoRoot: $repoRoot" -ForegroundColor White
Write-Host "Bundle:   $bundlePath" -ForegroundColor White
Write-Host "Ticket:   $ticketPath" -ForegroundColor White
Write-Host ""
Write-Host "Como usar:" -ForegroundColor Cyan
Write-Host "1) Abra o arquivo do ticket e cole no ChatGPT/Copilot Chat." -ForegroundColor White
Write-Host "2) Em seguida cole o conteúdo do bundle (context-bundle.txt)." -ForegroundColor White
Write-Host ""
Write-Host "Dica: use -Force apenas para rodar com flag OFF (debug)." -ForegroundColor DarkGray