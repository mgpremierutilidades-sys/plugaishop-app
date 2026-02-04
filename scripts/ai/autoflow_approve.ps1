Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[approve] Commit/push only (no gates rerun)."
# adiciona os mesmos paths “safe” do runner (com --)
git add -- `
  ".gitignore" `
  ".vscode/tasks.json" `
  ".vscode/launch.json" `
  ".vscode/settings.json" `
  "app/_layout.tsx" `
  "app/(tabs)/_layout.tsx" `
  "app/(tabs)/explore.tsx" `
  "components/global-chrome.tsx" `
  "components/ui/collapsible.tsx" `
  "scripts/ai/_backup" `
  "scripts/ai/_autoflow/lib.ps1" `
  "scripts/ai/_autoflow/run.ps1" `
  "scripts/ai/autoflow_watch.ps1" `
  "scripts/ai/autoflow_approve.ps1"

git commit -m "chore(autoflow): approved hourly changes"
git push
Write-Host "[approve] OK"
