# Autopilot Workflow — Issue → Branch → PR

## Objetivo
Padronizar o ciclo:
Issue → branch → patch → commit → PR → merge → close issue

## 1) Criar branch e template do PR
```powershell
pwsh ./scripts/ai/start-issue.ps1 -Issue 58 -Area profile -Risk low -Summary "Preferências no Perfil"