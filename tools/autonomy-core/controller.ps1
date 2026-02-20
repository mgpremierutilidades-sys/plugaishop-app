param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TasksPath,
  [Parameter(Mandatory=$true)][string]$StatePath
)

function Read-Json($p) {
  if (!(Test-Path $p)) { return $null }
  return Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
}

function Write-Json($p, $obj) {
  $obj | ConvertTo-Json -Depth 50 | Out-File -FilePath $p -Encoding UTF8
}

$tasks = Read-Json $TasksPath
if ($null -eq $tasks) { throw "Missing tasks.json" }

# Seleciona a próxima task pendente (status: queued)
$next = $null
foreach ($t in $tasks.queue) {
  if ($t.status -eq "queued") { $next = $t; break }
}

if ($null -eq $next) {
  # Sem tasks: modo "observador" (só gates + report)
  Write-Output (@{
    mode = "observe"
    task = $null
  } | ConvertTo-Json -Depth 20)
  exit 0
}

Write-Output (@{
  mode = "execute"
  task = $next
} | ConvertTo-Json -Depth 20)