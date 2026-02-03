[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

New-Item -ItemType Directory -Force -Path .\.vscode | Out-Null

$tasksPath = ".vscode/tasks.json"
if (Test-Path -LiteralPath $tasksPath) {
  Write-Host "[vscode] tasks.json já existe; não vou sobrescrever. Envie o arquivo completo se quiser que eu integre."
  exit 0
}

@'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "autoflow: full",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/ai/autoflow.ps1", "-Mode", "full"],
      "problemMatcher": []
    },
    {
      "label": "autoflow: analyze",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/ai/autoflow.ps1", "-Mode", "analyze"],
      "problemMatcher": []
    },
    {
      "label": "autoflow: fix-routes",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/ai/autoflow.ps1", "-Mode", "fix-routes"],
      "problemMatcher": []
    },
    {
      "label": "lint",
      "type": "shell",
      "command": "npm",
      "args": ["run", "lint"],
      "problemMatcher": []
    },
    {
      "label": "tsc",
      "type": "shell",
      "command": "npm",
      "args": ["run", "tsc"],
      "problemMatcher": []
    }
  ]
}
'@ | Set-Content -Encoding UTF8 $tasksPath

Write-Host "[vscode] criado: $tasksPath"
