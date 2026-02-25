param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TasksPath,
  [Parameter(Mandatory=$true)][string]$BacklogPath,
  [ValidateSet("import","sync")][string]$Mode = "import"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$RepoRoot    = (Resolve-Path -LiteralPath $RepoRoot).Path
$TasksPath   = (Resolve-Path -LiteralPath $TasksPath).Path
$BacklogPath = (Resolve-Path -LiteralPath $BacklogPath).Path
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

function Get-JsonObject([string]$p) {
  if (!(Test-Path -LiteralPath $p)) { return $null }
  return Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Set-JsonObjectAtomic {
  [CmdletBinding(SupportsShouldProcess=$true)]
  param(
    [Parameter(Mandatory=$true)][string]$p,
    [Parameter(Mandatory=$true)][object]$obj,
    [int]$Depth = 80
  )
  $dir = Split-Path -Parent $p
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $tmp = "$p.tmp"
  if ($PSCmdlet.ShouldProcess($p, "Write JSON atomically")) {
    ($obj | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $tmp -Encoding UTF8 -Force
    Move-Item -LiteralPath $tmp -Destination $p -Force
  }
}

function Get-UtcNowIso() { (Get-Date).ToUniversalTime().ToString("s") + "Z" }

function Get-BacklogItem([string]$yamlPath) {
  $lines = Get-Content -LiteralPath $yamlPath -Encoding UTF8
  $items = New-Object System.Collections.Generic.List[object]
  $cur = $null
  $listMode = ""

  foreach ($raw in $lines) {
    $line = $raw.TrimEnd()
    if ($line.Trim().Length -eq 0) { continue }

    if ($line -match '^\-\s+id:\s*(.+)$') {
      if ($cur) { $items.Add($cur) }
      $cur = [ordered]@{
        id = ($Matches[1].Trim().Trim('"').Trim("'"))
        area = ""
        title = ""
        target_files = @()
        flag = ""
        metrics = @()
        status = ""
        risk = ""
      }
      $listMode = ""
      continue
    }

    if (-not $cur) { continue }

    if ($line -match '^\s*target_files:\s*$') { $listMode="target_files"; continue }
    if ($line -match '^\s*metrics:\s*$')      { $listMode="metrics"; continue }

    if ($listMode -ne "" -and $line -match '^\s*-\s*(.+)$') {
      $v = $Matches[1].Trim().Trim('"').Trim("'")
      if ($listMode -eq "target_files") { $cur.target_files += $v }
      if ($listMode -eq "metrics")      { $cur.metrics += $v }
      continue
    }

    if ($line -match '^\s*area:\s*(.+)$')   { $cur.area   = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*title:\s*(.+)$')  { $cur.title  = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*flag:\s*(.+)$')   { $cur.flag   = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*status:\s*(.+)$') { $cur.status = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
    if ($line -match '^\s*risk:\s*(.+)$')   { $cur.risk   = $Matches[1].Trim().Trim('"').Trim("'"); $listMode=""; continue }
  }

  if ($cur) { $items.Add($cur) }
  return ,$items
}

function Set-BacklogItem {
  [CmdletBinding(SupportsShouldProcess=$true)]
  param(
    [Parameter(Mandatory=$true)][string]$yamlPath,
    [Parameter(Mandatory=$true)][object[]]$items
  )

  $out = New-Object System.Collections.Generic.List[string]
  foreach ($it in $items) {
    $out.Add("- id: $($it.id)")
    if ($it.area)  { $out.Add("  area: $($it.area)") }
    if ($it.title) { $out.Add("  title: `"$($it.title)`"") }
    $out.Add("  target_files:")
    foreach ($f in @($it.target_files)) { $out.Add("    - $f") }
    if ($null -ne $it.flag) { $out.Add("  flag: $($it.flag)") }
    $out.Add("  metrics:")
    foreach ($m in @($it.metrics)) { $out.Add("    - $m") }
    $out.Add("  status: $($it.status)")
    if ($it.risk) { $out.Add("  risk: $($it.risk)") }
    $out.Add("")
  }

  $tmp = "$yamlPath.tmp"
  if ($PSCmdlet.ShouldProcess($yamlPath, "Write YAML atomically")) {
    $out | Out-File -FilePath $tmp -Encoding UTF8 -Force
    Move-Item -LiteralPath $tmp -Destination $yamlPath -Force
  }
}

function Initialize-TasksObject([object]$t) {
  if ($null -eq $t) { return [ordered]@{ v=1; queue=@() } }
  if ($null -eq $t.queue) { $t | Add-Member -NotePropertyName queue -NotePropertyValue @() -Force }
  if ($null -eq $t.v) { $t | Add-Member -NotePropertyName v -NotePropertyValue 1 -Force }
  return $t
}

function Reset-TaskRunFields([object]$t) {
  foreach ($k in @("running_utc","failed_utc","completed_utc")) {
    if ($t.PSObject.Properties.Name -contains $k) {
      $t | Add-Member -NotePropertyName $k -NotePropertyValue $null -Force
    }
  }
}

function Select-NextBacklogItem([object[]]$items) {
  # 1) Normal: first queued
  foreach ($it in $items) {
    if (($it.status + "") -eq "queued") { return $it }
  }

  # 2) Autoqueue: first blocked with risk low
  foreach ($it in $items) {
    if (($it.status + "") -eq "blocked" -and (($it.risk + "") -eq "low")) {
      $it.status = "queued"
      return $it
    }
  }

  return $null
}

function Import-BacklogItem() {
  $items = Get-BacklogItem -yamlPath $BacklogPath
  if (-not $items -or $items.Count -eq 0) { return }

  $pick = Select-NextBacklogItem $items
  if (-not $pick) { return }

  $tasks = Initialize-TasksObject (Get-JsonObject -p $TasksPath)

  # If task already exists: requeue only when failed
  foreach ($t in @($tasks.queue)) {
    if (($t.id + "") -ne ($pick.id + "")) { continue }

    $st = ($t.status + "")
    if ($st -eq "failed") {
      $t.status = "queued"
      Reset-TaskRunFields $t
      Set-JsonObjectAtomic -p $TasksPath -obj $tasks -Depth 80

      $pick.status = "in_progress"
      Set-BacklogItem -yamlPath $BacklogPath -items $items
    }

    return
  }

  # Add as new task
  $now = Get-UtcNowIso
  $task = [ordered]@{
    id = $pick.id
    title = $pick.title
    status = "queued"
    type = ($pick.area ? $pick.area : "backlog")
    created_utc = $now
    payload = [ordered]@{
      action = "backlog_dispatch_v1"
      backlog = [ordered]@{
        id = $pick.id
        area = $pick.area
        title = $pick.title
        target_files = @($pick.target_files)
        flag = $pick.flag
        metrics = @($pick.metrics)
        risk = $pick.risk
      }
    }
  }

  $tasks.queue += $task
  Set-JsonObjectAtomic -p $TasksPath -obj $tasks -Depth 80

  $pick.status = "in_progress"
  Set-BacklogItem -yamlPath $BacklogPath -items $items
}

function Sync-BacklogStatus() {
  $items = Get-BacklogItem -yamlPath $BacklogPath
  if (-not $items -or $items.Count -eq 0) { return }

  $tasks = Initialize-TasksObject (Get-JsonObject -p $TasksPath)
  $map = @{}
  foreach ($t in @($tasks.queue)) { if ($t.id) { $map[$t.id.ToString()] = $t } }

  $changed = $false
  foreach ($it in $items) {
    $id = $it.id.ToString()
    if (-not $map.ContainsKey($id)) { continue }
    $st = ($map[$id].status + "")
    if ($st -eq "done" -and $it.status -ne "done") { $it.status="done"; $changed=$true }
    if ($st -eq "failed" -and $it.status -ne "blocked") { $it.status="blocked"; $changed=$true }
  }

  if ($changed) { Set-BacklogItem -yamlPath $BacklogPath -items $items }
}

if ($Mode -eq "import") { Import-BacklogItem; exit 0 }
if ($Mode -eq "sync")   { Sync-BacklogStatus; exit 0 }