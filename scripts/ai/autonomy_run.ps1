$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory((Get-Location).Path)

# Wrapper simples: roda o autonomy core
pwsh -NoProfile -ExecutionPolicy Bypass -File "tools/autonomy-core/runner.ps1"