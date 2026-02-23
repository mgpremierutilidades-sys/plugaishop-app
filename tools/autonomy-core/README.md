# Plugaishop Autonomy Core

Este módulo é o "cérebro" da autonomia do Plugaishop.

## Objetivo
Executar ciclos autônomos com:
- leitura de tasks (fila)
- execução de gates (lint + typecheck)
- geração de report
- rollback automático (quando aplicável)

## Como rodar
- Via npm:
  - `npm run autonomy`
- Via PowerShell:
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/autonomy-core/runner.ps1`

## Saídas
- `tools/autonomy-core/_out/`:
  - `report-*.md`
  - `run-*.log`
  - `run-*.err.log`

## Tasks
Edite `tools/autonomy-core/tasks.json` para enfileirar tarefas.