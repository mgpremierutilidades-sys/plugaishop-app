[CmdletBinding()]
param(
  [string]$Mode = "full"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[watch] Running autoflow (no commit/push)..."
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\ai\_autoflow\run.ps1 -Mode $Mode -AutoCommit:$false -AutoPush:$false

Write-Host "[watch] Starting Expo (LAN + dev client)..."
# deixa o Expo rodando no terminal atual
npx expo start --lan --dev-client
