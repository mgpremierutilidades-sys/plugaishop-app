# Baseline — Opacidade OK (Carrinho)

## Objetivo
Manter um ponto de partida “bom” e impedir regressões (opacidade/dimming) sem alterar layout.

## Setup (rodar 1x por máquina)
```powershell
cd C:\plugaishop-app
powershell -ExecutionPolicy Bypass -File .\scripts\hooks\setup-hooks.ps1
