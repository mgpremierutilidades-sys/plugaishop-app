@echo off
"C:\Program Files\PowerShell\7\pwsh.exe" -NoProfile -ExecutionPolicy Bypass -File "E:\plugaishop-app\scripts\ai\run-gh-queue-forever.ps1" -ProjectRoot "E:\plugaishop-app" -LoopSeconds 30 -Fast
