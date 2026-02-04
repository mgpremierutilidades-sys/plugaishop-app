cd C:\plugaishop-app

@'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m){ Write-Host "[vscode-setup] $m" }

New-Item -ItemType Directory -Force -Path .\.vscode | Out-Null

# tasks.json já existe (você criou). Não sobrescreve.
if (Test-Path -LiteralPath ".vscode\tasks.json") {
  Say "tasks.json exists (skip)"
} else {
  throw "Expected .vscode/tasks.json to exist, but it doesn't."
}

# launch.json (safe create)
if (!(Test-Path -LiteralPath ".vscode\launch.json")) {
@'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Expo: Start (LAN) + Dev Client",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["expo", "start", "--lan", "--dev-client"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Expo: Start (Tunnel) + Dev Client",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["expo", "start", "--tunnel", "--dev-client"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
'@ | Set-Content -Encoding UTF8 ".vscode\launch.json"

  Say "created: .vscode/launch.json"
} else {
  Say "launch.json exists (skip)"
}

# settings.json (safe append minimal defaults if missing)
if (!(Test-Path -LiteralPath ".vscode\settings.json")) {
@'
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
'@ | Set-Content -Encoding UTF8 ".vscode\settings.json"
  Say "created: .vscode/settings.json"
} else {
  Say "settings.json exists (skip)"
}

Say "OK"
'@ | Set-Content -Encoding UTF8 .\scripts\ai\setup_vscode.ps1

.\scripts\ai\setup_vscode.ps1
git add .vscode/launch.json .vscode/settings.json scripts/ai/setup_vscode.ps1
git commit -m "chore(vscode): add launch configs + safe settings"
git push
