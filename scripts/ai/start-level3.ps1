Write-Host "🚀 Plugaishop NÍVEL 3 (IA como cérebro via State Bundles) - Prompt Zero prioridade #0"
$ErrorActionPreference = "Stop"

if (!(Test-Path "scripts/ai/PROMPT_ZERO.md")) { throw "PROMPT_ZERO.md ausente. Abortando." }

mkdir handoff\commands -Force | Out-Null
mkdir handoff\processed -Force | Out-Null
mkdir handoff\logs -Force | Out-Null
mkdir handoff\state -Force | Out-Null
mkdir handoff\state_bundles -Force | Out-Null
mkdir handoff\approvals\requests -Force | Out-Null
mkdir handoff\bundle_requests -Force | Out-Null
mkdir approvals\inbox -Force | Out-Null

# Gera índice
node scripts/ai/index-generator.mjs --root .
if ($LASTEXITCODE -ne 0) { throw "Index generator falhou." }

# State mirror (IA)
Start-Process python -ArgumentList "scripts/ai/state_exporter.py" -WindowStyle Minimized

# Bundle daemon (se existir)
if (Test-Path "scripts/ai/bundle_daemon.py") {
  Start-Process python -ArgumentList "scripts/ai/bundle_daemon.py" -WindowStyle Minimized
}

# Planner (loop)
Start-Process python -ArgumentList "scripts/ai/planner_autonomo.py" -WindowStyle Minimized

# Executor (foreground) - mantenha só este aberto
python scripts/ai/agent_loop.py --loop
