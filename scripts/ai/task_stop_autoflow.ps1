Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
# Para o autopilot no horário combinado
schtasks /Change /TN "Plugaishop-Autoflow-15min" /Disable | Out-Null
