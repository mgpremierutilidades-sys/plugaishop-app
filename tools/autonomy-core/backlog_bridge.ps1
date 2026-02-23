# tools/autonomy-core/backlog_bridge.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TasksPath,
  [Parameter(Mandatory=$true)][string]$BacklogPath,
  [ValidateSet("import","sync")][string]$Mode = "import"
)

Set-StrictMode -Version Latest
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

function Trim-Quotes([string]$s) {
  if ($null -eq $s) { return $s }
  $t = $s.Trim()
  if (($t.StartsWith('"') -and $t.EndsWith('"')) -or ($t.StartsWith("'") -and $t.EndsWith("'"))) {
    return $t.Substring(1, $t.Length - 2)
  }
  return $t
}

function Parse-BacklogYaml([string]$path) {
  if (!(Test-Path $path)) { return @() }
  $lines = Get-Content -LiteralPath $path -Encoding UTF8
  $items = New-Object System.Collections.Generic.List[object]

  $cur = $null
  $listKey = $null

  foreach ($raw in $lines) {
    $line = $raw
    if ($null -eq $line) { continue }
    $line = $line.TrimEnd()

    if ($line.Trim().Length -eq 0) { continue }

    # start item: - id: X
    if ($line -match '^\s*-\s*id:\s*(.+)$') {
      if ($null -ne $cur) { $items.Add([pscustomobject]$cur) }
      $cur = [ordered]@{}
      $cur["id"] = (Trim-Quotes $Matches[1])
      $listKey = $null
      continue
    }

    if ($null -eq $cur) { continue }

    # list key like: target_files:
    if ($line -match '^\s*([A-Za-z0-9_]+)\s*:\s*$') {
      $k = $Matches[1]
      if ($k -in @("target_files","metrics")) {
        $cur[$k] = @()
        $listKey = $k
        continue
      }
      $listKey = $null
    }

    # list item: - something
    if ($null -ne $listKey -and $line -match '^\s*-\s*(.+)$') {
      $val = Trim-Quotes $Matches[1]
      $cur[$listKey] = @($cur[$listKey]) + @($val)
      continue
    }

    # key: value
    if ($line -match '^\s*([A-Za-z0-9_]+)\s*:\s*(.+)$') {
      $k = $Matches[1]
      $v = Trim-Quotes $Matches[2]
      $cur[$k] = $v
      $listKey = $null
      continue
    }
  }

  if ($null -ne $cur) { $items.Add([pscustomobject]$cur) }
  return @($items)
}

function Write-BacklogYaml([string]$path, [object[]]$items) {
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($it in $items) {
    if ($null -eq $it) { continue }
    $out.Add(("- id: " + $it.id))
    foreach ($k in @("area","title","flag","status","risk","linked_task_id","imported_utc","completed_utc","failed_utc","reason")) {
      if ($null -ne $it.$k -and $it.$k.ToString().Trim().Length -gt 0) {
        $v = $it.$k.ToString()
        $needsQuote = ($v -match '\s' -or $v -match '[:"]')
        if ($needsQuote) { $v = '"' + ($v.Replace('"','\"')) + '"' }
        $out.Add(("  " + $k + ": " + $v))
      }
    }

    foreach ($lk in @("target_files","metrics")) {
      if ($null -ne $it.$lk -and @($it.$lk).Count -gt 0) {
        $out.Add(("  " + $lk + ":"))
        foreach ($v0 in @($it.$lk)) {
          $v = $v0.ToString()
          $needsQuote = ($v -match '\s' -or $v -match '[:"]')
          if ($needsQuote) { $v = '"' + ($v.Replace('"','\"')) + '"' }
          $out.Add(("    - " + $v))
        }
      }
    }
  }

  $dir = Split-Path -Parent $path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  ($out -join "`n") | Out-File -FilePath $path -Encoding UTF8 -Force
}

function NowUtc() { (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") }

$tasks = Read-Json $TasksPath
if ($null -eq $tasks -or $null -eq $tasks.queue) { throw "tasks.json invalid at: $TasksPath" }

$items = Parse-BacklogYaml $BacklogPath

$changed = $false
$result = [ordered]@{
  ok = $true
  mode = $Mode
  imported_id = $null
  notes = @()
}

if ($Mode -eq "import") {
  # importa 1 por ciclo
  $next = $null
  foreach ($it in $items) {
    if ($null -eq $it) { continue }
    $st = ($it.status ?? "").ToString().Trim().ToLowerInvariant()
    if ($st -eq "queued") { $next = $it; break }
  }

  if ($null -eq $next) {
    $result.notes += "no_queued_items"
  } else {
    # evita duplicar
    $exists = $false
    foreach ($t in @($tasks.queue)) {
      if ($t -and $t.id -and $t.id.ToString().Trim() -eq $next.id.ToString().Trim()) { $exists = $true; break }
    }

    if ($exists) {
      $result.notes += ("already_imported=" + $next.id)
    } else {
      $taskObj = [ordered]@{
        id = $next.id
        title = ($next.title ?? ("Backlog " + $next.id))
        status = "queued"
        type = ($next.area ?? "backlog")
        created_utc = (NowUtc)
        payload = @{
          action = "backlog_dispatch_v1"
          backlog = $next
        }
      }

      $tasks.queue = @($tasks.queue) + @($taskObj)
      Write-JsonAtomic $TasksPath $tasks 50
      $changed = $true

      $next.status = "imported"
      $next.linked_task_id = $next.id
      $next.imported_utc = (NowUtc)
      $result.imported_id = $next.id

      Write-BacklogYaml $BacklogPath $items
      $result.notes += ("imported=" + $next.id)
    }
  }
}

if ($Mode -eq "sync") {
  foreach ($it in $items) {
    if ($null -eq $it) { continue }
    if (-not $it.linked_task_id) { continue }

    $tid = $it.linked_task_id.ToString().Trim()
    if (-not $tid) { continue }

    $tFound = $null
    foreach ($t in @($tasks.queue)) {
      if ($t -and $t.id -and $t.id.ToString().Trim() -eq $tid) { $tFound = $t; break }
    }

    if ($null -eq $tFound) { continue }

    $st = ($tFound.status ?? "").ToString().Trim().ToLowerInvariant()
    if ($st -eq "done" -and ($it.status -ne "done")) {
      $it.status = "done"
      $it.completed_utc = ($tFound.completed_utc ?? (NowUtc))
      $changed = $true
      $result.notes += ("synced_done=" + $tid)
    }
    if ($st -eq "failed" -and ($it.status -ne "blocked")) {
      $it.status = "blocked"
      $it.failed_utc = ($tFound.failed_utc ?? (NowUtc))
      if (-not $it.reason) { $it.reason = "task_failed" }
      $changed = $true
      $result.notes += ("synced_blocked=" + $tid)
    }
    if ($st -eq "running" -and ($it.status -ne "running")) {
      $it.status = "running"
      $changed = $true
      $result.notes += ("synced_running=" + $tid)
    }
  }

  if ($changed) { Write-BacklogYaml $BacklogPath $items }
}

$result.changed = $changed
$result | ConvertTo-Json -Depth 20
