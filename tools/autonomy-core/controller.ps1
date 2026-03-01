# tools/autonomy-core/controller.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TasksPath,
  [Parameter(Mandatory=$true)][string]$StatePath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

function Read-Json([string]$p) {
  if (!(Test-Path $p)) { return $null }
  return Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
}

function Write-JsonAtomic([string]$p, [object]$obj, [int]$Depth = 50) {
  $dir = Split-Path -Parent $p
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

  $tmp = "$p.tmp"
  ($obj | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $tmp -Encoding UTF8 -Force
  Move-Item -Path $tmp -Destination $p -Force
}

$tasks = Read-Json $TasksPath
if ($null -eq $tasks) { throw "Missing tasks.json (runtime) at: $TasksPath" }
if ($null -eq $tasks.queue) { throw "tasks.json missing queue array at: $TasksPath" }

# 1) RESUME: se existe uma task "running", retoma ela (não muda status)
$running = $null
foreach ($t in @($tasks.queue)) {
  if ($t -and $t.status -eq "running") { $running = $t; break }
}

if ($null -ne $running) {
  Write-Output (@{
    mode = "execute"
    task = $running
  } | ConvertTo-Json -Depth 20)
  exit 0
}

# 2) Normal: pega a próxima queued
$next = $null
foreach ($t in @($tasks.queue)) {
  if ($t -and $t.status -eq "queued") { $next = $t; break }
}

if ($null -eq $next) {
  Write-Output (@{
    mode = "observe"
    task = $null
  } | ConvertTo-Json -Depth 20)
  exit 0
}

# Marca como running (schema consistente: running_utc, failed_utc, completed_utc)
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
foreach ($t in @($tasks.queue)) {
  if ($t -and $t.id -eq $next.id) {
    $t.status = "running"

    if (-not ($t.PSObject.Properties.Name -contains "running_utc")) {
      $t | Add-Member -NotePropertyName running_utc -NotePropertyValue $now
    } else {
      $t.running_utc = $now
    }

    foreach ($p in @("failed_utc","completed_utc")) {
      if (-not ($t.PSObject.Properties.Name -contains $p)) {
        $t | Add-Member -NotePropertyName $p -NotePropertyValue $null
      }
    }
  }
}

Write-JsonAtomic $TasksPath $tasks 50

Write-Output (@{
  mode = "execute"
  task = $next
} | ConvertTo-Json -Depth 20)