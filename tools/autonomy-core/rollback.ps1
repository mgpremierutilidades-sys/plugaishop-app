param(
  [Parameter(Mandatory=$true)][string]$CommitSha
)

Write-Host ("[rollback] Reverting commit: " + $CommitSha)

git rev-parse --is-inside-work-tree | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Not inside a git repository." }

git revert --no-edit $CommitSha
if ($LASTEXITCODE -ne 0) { throw "git revert failed." }

Write-Host "[rollback] OK"