param([string]\E:\plugaishop-app\tools\autonomy-core)

\ = Join-Path \E:\plugaishop-app\tools\autonomy-core "_state\tasks.json"
\  = Join-Path \E:\plugaishop-app\tools\autonomy-core "tasks.seed.json"
\    = Join-Path \E:\plugaishop-app\tools\autonomy-core "_out"

\ = Get-Content \ -Raw
try { \ = \ | ConvertFrom-Json } catch {
  Copy-Item \ \ -Force
  Write-Output (@{ repaired=\True; reason="invalid_json_restore_seed" } | ConvertTo-Json -Depth 10)
  exit 0
}

if (\ -eq \.v -or \ -eq \.queue) {
  Copy-Item \ \ -Force
  Write-Output (@{ repaired=\True; reason="bad_schema_restore_seed" } | ConvertTo-Json -Depth 10)
  exit 0
}

Write-Output (@{ repaired=\False; reason="ok" } | ConvertTo-Json -Depth 10)
