# Repo 2 — Acesso ao Chat via Repositório (modo “bundle”)

Objetivo: gerar um **pacote de contexto do repo** e um **prompt padrão** para colar no ChatGPT/Copilot Chat, garantindo execução consistente e sem “trabalhar no escuro”.

## Pré-requisitos
- Windows + PowerShell 7 (`pwsh`) recomendado
- Repositório contém `scripts/ai/export-context.ps1`

## Feature-flag (continuidade no Maxximus Orchestrator)
A flag vive no arquivo já existente:

`tools/maxximus-orchestrator/data/state.json`

Adicione (ou ajuste) este trecho:

```json
{
  "featureFlags": {
    "repo2-chat-access": true
  }
}