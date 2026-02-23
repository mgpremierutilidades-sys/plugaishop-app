# tools/autonomy-core/backlog_bridge.ps1
# Bridge entre ops/backlog.queue.yml (YAML simples) e tools/autonomy-core/_state/tasks.json (runtime).
# Modos:
# - import: importa 1 item status=queued do YAML para tasks.json (status=queued) e marca YAML como in_progress
# - sync: sincroniza status done/failed do tasks.json para YAML (done/blocked)

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

function Read-Json([string]$p) {
  if (!(Test-Path -LiteralPath $p)) { return $null }
  return Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-JsonAtomic([string]$p, [object]$obj, [int]$Depth = 50) {
  $dir = Split-Path -Parent $p
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

  $tmp = "$p.tmp"
  ($obj | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $tmp -Encoding UTF8 -Force
  Move-Item -LiteralPath $tmp -Destination $p -Force
}

function NowUtcIso() {
  return (Get-Date).ToUniversalTime().ToString("s") + "Z"
}

function Parse-SimpleYamlQueue([string]$yamlPath) {
  # Parser mínimo para o formato usado em ops/backlog.queue.yml (lista de objetos)
  # Suporta:
  # - id, area, title, flag, status, risk
  # - target_files: [lista]
  # - metrics: [lista]
  $lines = Get-Content -LiteralPath $yamlPath -Encoding UTF8
  $items = New-Object System.Collections.Generic.List[object]

  $cur = $null
  $modeList = ""  # "target_files" | "metrics" | ""

  foreach ($raw in $lines) {
    $line = $raw.TrimEnd()

    if ($line.Trim().Length -eq 0) { continue }

    # novo item
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
      $modeList = ""
      continue
    }

    if (-not $cur) { continue }

    # listas
    if ($line -match '^\s*target_files:\s*$') { $modeList = "target_files"; continue }
    if ($line -match '^\s*metrics:\s*$')      { $modeList = "metrics"; continue }

    if ($modeList -ne "" -and $line -match '^\s*-\s*(.+)$') {
      $v = $Matches[1].Trim().Trim('"').Trim("'")
      if ($modeList -eq "target_files") { $cur.target_files += $v }
      if ($modeList -eq "metrics")      { $cur.metrics += $v }
      continue
    }

    # chave: valor
    if ($line -match '^\s*area:\s*(.+)$')   { $cur.area   = $Matches[1].Trim().Trim('"').Trim("'"); $modeList=""; continue }
    if ($line -match '^\s*title:\s*(.+)$')  { $cur.title  = $Matches[1].Trim().Trim('"').Trim("'"); $modeList=""; continue }
    if ($line -match '^\s*flag:\s*(.+)$')   { $cur.flag   = $Matches[1].Trim().Trim('"').Trim("'"); $modeList=""; continue }
    if ($line -match '^\s*status:\s*(.+)$') { $cur.status = $Matches[1].Trim().Trim('"').Trim("'"); $modeList=""; continue }
    if ($line -match '^\s*risk:\s*(.+)$')   { $cur.risk   = $Matches[1].Trim().Trim('"').Trim("'"); $modeList=""; continue }
  }

  if ($cur) { $items.Add($cur) }
  return ,$items
}

function Write-SimpleYamlQueue([string]$yamlPath, [object[]]$items) {
  $out = New-Object System.Collections.Generic.List[string]

  foreach ($it in $items) {
    $out.Add("- id: $($it.id)")
    if ($it.area)  { $out.Add("  area: $($it.area)") }
    if ($it.title) { $out.Add("  title: `"$($it.title)`"") }

    $out.Add("  target_files:")
    foreach ($f in @($it.target_files)) { $out.Add("    - $f") }

    if ($it.flag) { $out.Add("  flag: $($it.flag)") }

    $out.Add("  metrics:")
    foreach ($m in @($it.metrics)) { $out.Add("    - $m") }

    if ($it.status) { $out.Add("  status: $($it.status)") }
    if ($it.risk)   { $out.Add("  risk: $($it.risk)") }
  }

  $tmp = "$yamlPath.tmp"
  $out | Out-File -FilePath $tmp -Encoding UTF8 -Force
  Move-Item -LiteralPath $tmp -Destination $yamlPath -Force
}

function Ensure-TasksShape([object]$tasks) {
  if ($null -eq $tasks) {
    return [ordered]@{ v = 1; queue = @() }
  }
  if ($null -eq $tasks.queue) {
    $tasks | Add-Member -NotePropertyName "queue" -NotePropertyValue @() -Force
  }
  if ($null -eq $tasks.v) {
    $tasks | Add-Member -NotePropertyName "v" -NotePropertyValue 1 -Force
  }
  return $tasks
}

function Import-One() {
  $items = Parse-SimpleYamlQueue $BacklogPath
  if (-not $items -or $items.Count -eq 0) {
    Write-Host "[bridge] no backlog items"
    return
  }

  $pick = $null
  foreach ($it in $items) {
    if (($it.status + "") -eq "queued") { $pick = $it; break }
  }

  if (-not $pick) {
    Write-Host "[bridge] no queued item"
    return
  }

  $tasks = Ensure-TasksShape (Read-Json $TasksPath)

  # evita duplicar
  foreach ($t in @($tasks.queue)) {
    if (($t.id + "") -eq ($pick.id + "")) {
      Write-Host "[bridge] already in tasks.json: $($pick.id)"
      # trava no YAML pra não ficar eternamente queued
      $pick.status = "in_progress"
      Write-SimpleYamlQueue $BacklogPath $items
      return
    }
  }

  $now = NowUtcIso
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
  }$tasks.queue += $task
  Write-JsonAtomic $TasksPath $tasks 50

  # trava item no YAML
  $pick.status = "in_progress"
  Write-SimpleYamlQueue $BacklogPath $items

  Write-Host "[bridge] imported: $($pick.id)"
}

function Sync-Back() {
  $items = Parse-SimpleYamlQueue $BacklogPath
  if (-not $items -or $items.Count -eq 0) { return }

  $tasks = Ensure-TasksShape (Read-Json $TasksPath)
  $map = @{}
  foreach ($t in @($tasks.queue)) {
    if ($null -ne $t.id) { $map[$t.id.ToString()] = $t }
  }

  $changed = $false
  foreach ($it in $items) {
    $id = $it.id.ToString()
    if (-not $map.ContainsKey($id)) { continue }
    $t = $map[$id]
    $st = ($t.status + "")
    if ($st -eq "done" -and $it.status -ne "done") {
      $it.status = "done"
      $changed = $true
    }
    if ($st -eq "failed" -and $it.status -ne "blocked") {
      $it.status = "blocked"
      $changed = $true
    }
  }

  if ($changed) {
    Write-SimpleYamlQueue $BacklogPath $items
    Write-Host "[bridge] sync updated yaml"
  } else {
    Write-Host "[bridge] sync no changes"
  }
}

if ($Mode -eq "import") { Import-One; exit 0 }
if ($Mode -eq "sync")   { Sync-Back; exit 0 }



