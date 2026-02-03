param(
  [string]$Branch = "",
  [string]$OutDir = "context/_artifacts"
)

$ErrorActionPreference = "Stop"
$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

if (!(Test-Path -LiteralPath "context/route_collision_files_dump.txt")) {
  throw "Missing: context/route_collision_files_dump.txt (rode scripts/ai/autoflow_step2.ps1 primeiro)"
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = (git branch --show-current).Trim()
}

# exige gh
gh --version | Out-Null
gh auth status | Out-Null

Write-Host "Running workflow on branch: $Branch"
gh workflow run "Autoflow Upload" --ref $Branch | Out-Null
Start-Sleep -Seconds 2

$runId = (gh run list --workflow "Autoflow Upload" --limit 1 --json databaseId -q ".[0].databaseId")
if (!$runId) { throw "Could not find workflow run id." }

Write-Host "Run ID: $runId"
gh run watch $runId

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
gh run download $runId -n route-collision-dump -D $OutDir

Write-Host "Downloaded to: $OutDir"
Get-ChildItem -Recurse $OutDir
