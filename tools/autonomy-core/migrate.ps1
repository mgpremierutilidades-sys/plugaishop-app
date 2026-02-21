param([string]\E:\plugaishop-app\tools\autonomy-core)

\E:\plugaishop-app\tools\autonomy-core\migrations = Join-Path \E:\plugaishop-app\tools\autonomy-core "migrations"
\ = Join-Path \E:\plugaishop-app\tools\autonomy-core "_state\migrations.json"

if (-not (Test-Path \)) {
  @{ v = 1; applied = @() } | ConvertTo-Json -Depth 10 | Set-Content \ -Encoding UTF8
}

\ = Get-Content \ -Raw | ConvertFrom-Json
\ = @()
if (\ -and \.applied) { \ = @(\.applied) }

\ = Get-ChildItem \E:\plugaishop-app\tools\autonomy-core\migrations -Filter "*.ps1" | Sort-Object Name
\ = New-Object System.Collections.Generic.List[string]

foreach (\ in \) {
  if (\ -contains \.Name) { continue }
  \ = & pwsh -NoProfile -ExecutionPolicy Bypass -File \.FullName -CoreDir \E:\plugaishop-app\tools\autonomy-core
  \.Add("apply=" + \.Name)
  \ += \.Name
}

\.applied = \
(\ | ConvertTo-Json -Depth 10) | Set-Content \ -Encoding UTF8

@{ ok=\True; applied=\; notes=\ } | ConvertTo-Json -Depth 10
