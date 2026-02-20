param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TasksPath,
  [Parameter(Mandatory=$true)][string]$StatePath
)

function Read-Json([string]$p) {
  if (!(Test-Path $p)) { return $null }
  return Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
}

function Write-Json([string]$p, [object]$obj, [int]$Depth = 50) {
  ($obj | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $p -Encoding UTF8 -Force
}

$tasks = Read-Json $TasksPath
if ($null -eq $tasks) { throw "Missing tasks.json (runtime) at: $TasksPath" }

$next = $null
foreach ($t in $tasks.queue) {
  if ($t.status -eq "queued") { $next = $t; break }
}

if ($null -eq $next) {
  Write-Output (@{
    mode = "observe"
    task = $null
  } | ConvertTo-Json -Depth 20)
  exit 0
}

# Marca como running (persistente no runtime tasks)
foreach ($t in $tasks.queue) {
  if ($t.id -eq $next.id) {
    $t.status = "running"
    $t.started_utc = (Get-Date).ToUniversalTime().ToString("s") + "Z"
  }
}

Write-Json $TasksPath $tasks 50

Write-Output (@{
  mode = "execute"
  task = $next
} | ConvertTo-Json -Depth 20)