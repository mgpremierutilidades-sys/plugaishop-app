cd /d E:\plugaishop-app
set AUTONOMY_MODE=execute
:loop
npm run autonomy
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
goto loop
