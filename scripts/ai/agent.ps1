# scripts/ai/agent.ps1
# Wrapper simples pra rodar o agente no Windows.
# Uso:
#   .\scripts\ai\agent.ps1 once
#   .\scripts\ai\agent.ps1 loop

param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("once","loop")]
  [string]$mode
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent | Split-Path -Parent)

if ($mode -eq "once") {
  python .\scripts\ai\agent_loop.py --once
} else {
  python .\scripts\ai\agent_loop.py --loop
}
