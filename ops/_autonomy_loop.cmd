@echo off
setlocal enableextensions
cd /d "E:\plugaishop-app"
set "AUTONOMY_MODE=execute"
set "AUTONOMY_TRIGGER=manual"
:loop
npm run autonomy
timeout /t 2 /nobreak >nul
goto loop
