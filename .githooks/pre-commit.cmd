@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\hooks\run-checks.ps1" -Mode "pre-commit"
exit /b %ERRORLEVEL%
