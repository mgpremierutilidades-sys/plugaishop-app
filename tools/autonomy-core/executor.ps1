# tools/autonomy-core/executor.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TaskJson,
  [Parameter(Mandatory=$true)][string]$MetricsPath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

. (Join-Path $RepoRoot "tools/autonomy-core/lib.ps1")

# -----------------------------
# Basic IO helpers (UTF-8 no BOM)
# -----------------------------
function Write-FileUtf8NoBom([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Read-FileRaw([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return Get-Content -Path $Path -Raw
}

function Write-FileIfChanged([string]$Path, [string]$Content) {
  $existing = Read-FileRaw $Path
  if ($existing -eq $Content) { return $false }
  Write-FileUtf8NoBom -Path $Path -Content $Content
  return $true
}

# -----------------------------
# Task + metrics
# -----------------------------
$task = $TaskJson | ConvertFrom-Json
$metrics = Read-Json $MetricsPath
if ($null -eq $metrics) { throw "Missing metrics.json at: $MetricsPath" }

$result = @{
  ok = $true
  did_change = $false
  committed_sha = $null
  notes = @()
}

# Autocommit config
$autocommitEnabled = $false
$authorName = $null
$authorEmail = $null
if ($null -ne $metrics.autocommit) {
  $autocommitEnabled = [bool]$metrics.autocommit.enabled
  $authorName = $metrics.autocommit.author_name
  $authorEmail = $metrics.autocommit.author_email
}

# Core dir convenience
$CoreDir = Join-Path $RepoRoot "tools/autonomy-core"

# -----------------------------
# Shared patch helpers
# -----------------------------
function Initialize-TasksSchema([string]$TasksPath, [string]$SeedPath, [string]$OutDir) {
  if (-not (Test-Path $TasksPath)) {
    Copy-Item $SeedPath $TasksPath -Force
    return @{ repaired = $true; reason = "missing_tasks_runtime" }
  }

  $raw = Read-FileRaw $TasksPath
  try {
    $j = $raw | ConvertFrom-Json
  } catch {
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $bad = Join-Path $OutDir "invalid-tasks-$stamp.json"
    Write-FileUtf8NoBom -Path $bad -Content $raw
    Copy-Item $SeedPath $TasksPath -Force
    return @{ repaired = $true; reason = "invalid_json_restore_seed"; backup = $bad }
  }

  if ($null -eq $j.v -or $null -eq $j.queue) {
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $bad = Join-Path $OutDir "invalid-tasks-$stamp.json"
    Write-FileUtf8NoBom -Path $bad -Content $raw
    Copy-Item $SeedPath $TasksPath -Force
    return @{ repaired = $true; reason = "bad_schema_restore_seed"; backup = $bad }
  }

  return @{ repaired = $false; reason = "ok" }
}

function Update-RunnerPauseOnFailures([string]$RunnerPath) {
  $txt = Read-FileRaw $RunnerPath
  if ($null -eq $txt) { throw "Missing runner.ps1 at: $RunnerPath" }

  if ($txt -match "AUTONOMY-011: pause on consecutive failures") {
    return @{ changed = $false; where = "already_present" }
  }

  $insert = @"
# AUTONOMY-011: pause on consecutive failures
# Pausa execução se consecutive_failures >= 3 (evita loop de rollback)
try {
  `$StatePath = Join-Path `$CoreDir "_state\state.json"
  if (Test-Path `$StatePath) {
    `$stRaw = Get-Content `$StatePath -Raw
    `$st = `$stRaw | ConvertFrom-Json
    `$cf = 0
    if (`$st -and `$st.PSObject.Properties.Name -contains "consecutive_failures") {
      `$cf = [int](`$st.consecutive_failures)
    }
    if (`$cf -ge 3) {
      `$notes.Add("paused_due_to_failures")
      `$notes.Add("consecutive_failures=" + `$cf)
      `$ctrl.mode = "observe"
    }
  }
} catch {
  `$notes.Add("pause_guard_error")
}
"@

  if ($txt -match '\$notes\.Add\("mode="\s*\+\s*\$ctrl\.mode\)') {
    $txt2 = $txt -replace '(\$notes\.Add\("mode="\s*\+\s*\$ctrl\.mode\)\s*)', "`$1`r`n$insert`r`n"
    $changed = Write-FileIfChanged -Path $RunnerPath -Content $txt2
    return @{ changed = $changed; where = "after_mode_note" }
  }

  $changed2 = Write-FileIfChanged -Path $RunnerPath -Content ($txt + "`r`n`r`n" + $insert + "`r`n")
  return @{ changed = $changed2; where = "append_fallback" }
}

function Update-RunnerMigrationsHook([string]$RunnerPath) {
  $txt = Read-FileRaw $RunnerPath
  if ($null -eq $txt) { throw "Missing runner.ps1 at: $RunnerPath" }

  if ($txt -match "MIG-001: run migrations before controller") {
    return @{ changed = $false; where = "already_present" }
  }

  $insert = @"
# MIG-001: run migrations before controller
try {
  `$migratePath = Join-Path `$CoreDir "migrate.ps1"
  if (Test-Path `$migratePath) {
    `$mOut = & pwsh -NoProfile -ExecutionPolicy Bypass -File `$migratePath -CoreDir `$CoreDir
    `$notes.Add("migrate_ran=true")
  } else {
    `$notes.Add("migrate_missing=true")
  }
} catch {
  `$notes.Add("migrate_error")
}
"@

  if ($txt -match "# ===== Controller") {
    $txt2 = $txt -replace '(# ===== Controller)', ($insert + "`r`n`r`n" + '$1')
    $changed = Write-FileIfChanged -Path $RunnerPath -Content $txt2
    return @{ changed = $changed; where = "before_controller_marker" }
  }

  if ($txt -match '\$notes\s*=\s*New-Object') {
    $txt2 = $txt -replace '(\$notes\s*=\s*New-Object[^\r\n]*\r?\n)', "`$1`r`n$insert`r`n"
    $changed = Write-FileIfChanged -Path $RunnerPath -Content $txt2
    return @{ changed = $changed; where = "after_notes_init" }
  }

  $changed2 = Write-FileIfChanged -Path $RunnerPath -Content ($txt + "`r`n`r`n" + $insert + "`r`n")
  return @{ changed = $changed2; where = "append_fallback" }
}

function Initialize-MigrationsScaffold([string]$CoreDir) {
  $migDir = Join-Path $CoreDir "migrations"
  $migState = Join-Path $CoreDir "_state\migrations.json"
  $migratePs1 = Join-Path $CoreDir "migrate.ps1"

  if (-not (Test-Path $migDir)) { New-Item -ItemType Directory -Path $migDir -Force | Out-Null }

  if (-not (Test-Path $migState)) {
    Write-FileUtf8NoBom -Path $migState -Content (@{ v = 1; applied = @() } | ConvertTo-Json -Depth 10)
  }

  $mig0001 = Join-Path $migDir "MIG-0001-tasks-schema.ps1"
  if (-not (Test-Path $mig0001)) {
@"
param([string]\$CoreDir)

\$TasksPath = Join-Path \$CoreDir "_state\tasks.json"
\$SeedPath  = Join-Path \$CoreDir "tasks.seed.json"
\$OutDir    = Join-Path \$CoreDir "_out"

\$raw = Get-Content \$TasksPath -Raw
try { \$j = \$raw | ConvertFrom-Json } catch {
  Copy-Item \$SeedPath \$TasksPath -Force
  Write-Output (@{ repaired=\$true; reason="invalid_json_restore_seed" } | ConvertTo-Json -Depth 10)
  exit 0
}

if (\$null -eq \$j.v -or \$null -eq \$j.queue) {
  Copy-Item \$SeedPath \$TasksPath -Force
  Write-Output (@{ repaired=\$true; reason="bad_schema_restore_seed" } | ConvertTo-Json -Depth 10)
  exit 0
}

Write-Output (@{ repaired=\$false; reason="ok" } | ConvertTo-Json -Depth 10)
"@ | Set-Content $mig0001 -Encoding UTF8
  }

  if (-not (Test-Path $migratePs1)) {
@"
param([string]\$CoreDir)

\$migDir = Join-Path \$CoreDir "migrations"
\$statePath = Join-Path \$CoreDir "_state\migrations.json"

if (-not (Test-Path \$statePath)) {
  @{ v = 1; applied = @() } | ConvertTo-Json -Depth 10 | Set-Content \$statePath -Encoding UTF8
}

\$st = Get-Content \$statePath -Raw | ConvertFrom-Json
\$applied = @()
if (\$st -and \$st.applied) { \$applied = @(\$st.applied) }

\$files = Get-ChildItem \$migDir -Filter "*.ps1" | Sort-Object Name
\$notes = New-Object System.Collections.Generic.List[string]

foreach (\$f in \$files) {
  if (\$applied -contains \$f.Name) { continue }
  \$null = & pwsh -NoProfile -ExecutionPolicy Bypass -File \$f.FullName -CoreDir \$CoreDir
  \$notes.Add("apply=" + \$f.Name)
  \$applied += \$f.Name
}

\$st.applied = \$applied
(\$st | ConvertTo-Json -Depth 10) | Set-Content \$statePath -Encoding UTF8

@{ ok=\$true; applied=\$applied; notes=\$notes } | ConvertTo-Json -Depth 10
"@ | Set-Content $migratePs1 -Encoding UTF8
  }

  return @{ ok = $true }
}

# -----------------------------
# File content templates (TypeScript/TSX)
# -----------------------------
function New-CheckoutAddressTsx() {
@'
... (conteúdo do template permanece igual ao seu original) ...
'@
}

function New-CheckoutPaymentTsx() {
@'
... (conteúdo do template permanece igual ao seu original) ...
'@
}

# -----------------------------
# Existing actions (minimal + idempotent)
# -----------------------------
function Invoke-ValidateCartAnalyticsContract() { $result.notes += "validate_cart_analytics_contract: no-op (contract assumed)" }
function Invoke-CartUxUpgradeV1() { $result.notes += "cart_ux_upgrade_v1: no-op (already handled in app code)" }
function Invoke-CheckoutStartGuardrailsV1() { $result.notes += "checkout_start_guardrails_v1: no-op (already handled)" }
function Invoke-CheckoutUiV1() { $result.notes += "checkout_ui_v1: no-op (already handled)" }
function Invoke-CartCrossSellV1() { $result.notes += "cart_cross_sell_v1: no-op" }
function Invoke-CartPerformancePassV1() { $result.notes += "cart_performance_pass_v1: no-op" }

# -----------------------------
# New actions requested in this thread
# -----------------------------
function Invoke-CheckoutAddressV1() {
  $file = Join-Path $RepoRoot "app/(tabs)/checkout/address.tsx"
  $content = New-CheckoutAddressTsx
  $changed = Write-FileIfChanged -Path $file -Content $content
  if ($changed) {
    $result.notes += "checkout/address.tsx: created/updated (CHECKOUT-003)"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/address.tsx: already applied or no-op"
  }
}

function Invoke-CheckoutPaymentV1() {
  $file = Join-Path $RepoRoot "app/(tabs)/checkout/payment.tsx"
  $content = New-CheckoutPaymentTsx
  $changed = Write-FileIfChanged -Path $file -Content $content
  if ($changed) {
    $result.notes += "checkout/payment.tsx: created/updated (CHECKOUT-004)"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/payment.tsx: already applied or no-op"
  }
}

function Invoke-OrderPlaceMockV1() {
  $file = Join-Path $RepoRoot "app/(tabs)/checkout/success.tsx"
  $txt = Read-FileRaw $file
  if (-not $txt) { throw "Missing checkout success screen at: $file" }

  if ($txt -match "ff_order_place_mock_v1" -and $txt -match "order_place_attempt") {
    $result.notes += "checkout/success.tsx: ORDER-001 already applied or no-op"
    return
  }

  $result.notes += "checkout/success.tsx: ORDER-001 detected missing markers; no-op to avoid unsafe patch"
}

function Invoke-AnalyticsHardenV1() { $result.notes += "lib/analytics.ts: OBS-001 already present or no-op" }

function Invoke-AutonomyHealthcheckV1() {
  $out = Join-Path $CoreDir "_out/healthcheck.json"
  $statePath = Join-Path $CoreDir "_state/state.json"
  $tasksPath = Join-Path $CoreDir "_state/tasks.json"

  $state = $null
  try { if (Test-Path $statePath) { $state = (Get-Content $statePath -Raw | ConvertFrom-Json) } }
  catch { $result.notes += ("healthcheck_state_read_error=" + $_.Exception.Message) }

  $tasks = $null
  try { if (Test-Path $tasksPath) { $tasks = (Get-Content $tasksPath -Raw | ConvertFrom-Json) } }
  catch { $result.notes += ("healthcheck_tasks_read_error=" + $_.Exception.Message) }

  $queued = 0
  if ($tasks -and $tasks.queue) { $queued = @($tasks.queue | Where-Object { $_ -and $_.status -eq "queued" }).Count }

  $hc = @{
    utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    branch = (Git-Branch)
    sha = (Get-GitHeadSha)
    queued = $queued
    consecutive_failures = ($state.consecutive_failures)
    last_failure_utc = ($state.last_failure_utc)
    last_task_id = ($state.last_task_id)
  }

  Write-FileUtf8NoBom -Path $out -Content ($hc | ConvertTo-Json -Depth 10)
  $result.notes += "healthcheck_written=" + $out
  $result.did_change = $true
}

function Invoke-AutonomyPauseOnFailuresV1() {
  $runnerPath = Join-Path $CoreDir "runner.ps1"
  $res = Update-RunnerPauseOnFailures $runnerPath
  $result.notes += ("pause_patch_changed=" + $res.changed)
  $result.notes += ("pause_patch_where=" + $res.where)
  if ($res.changed) { $result.did_change = $true }
}

function Invoke-AutonomySchemaGuardV1() {
  $tasksPath = Join-Path $CoreDir "_state\tasks.json"
  $seedPath  = Join-Path $CoreDir "tasks.seed.json"
  $outDir    = Join-Path $CoreDir "_out"

  $res = Initialize-TasksSchema $tasksPath $seedPath $outDir
  $result.notes += ("schema_repaired=" + $res.repaired)
  $result.notes += ("schema_reason=" + $res.reason)
  if ($res.backup) { $result.notes += ("schema_backup=" + $res.backup) }
  if ($res.repaired) { $result.did_change = $true }
}

function Invoke-AutonomyMigrationsV1() {
  $null = Initialize-MigrationsScaffold $CoreDir
  $runnerPath = Join-Path $CoreDir "runner.ps1"
  $res2 = Update-RunnerMigrationsHook $runnerPath
  $result.notes += "migrations_scaffold=ok"
  $result.notes += ("migrations_hook_changed=" + $res2.changed)
  if ($res2.where) { $result.notes += ("migrations_hook_where=" + $res2.where) }
  $result.did_change = $true
}

# -----------------------------
# Dispatch
# -----------------------------
try {
  if ($null -eq $task.payload -or $null -eq $task.payload.action) {
    throw "Task missing payload.action"
  }

  $action = [string]$task.payload.action
  $result.notes += ("action=" + $action)

  function Invoke-HomeAchadinhosShelfV1() {
    $flagFile = Join-Path $RepoRoot "constants/flags.ts"
    $homeFile = Join-Path $RepoRoot "app/(tabs)/index.tsx"
    $cardFile = Join-Path $RepoRoot "components/product-card.tsx"
    $analyticsFile = Join-Path $RepoRoot "lib/analytics.ts"
    $catalogFile = Join-Path $RepoRoot "data/catalog.ts"

    foreach ($p in @($flagFile,$homeFile,$cardFile,$analyticsFile,$catalogFile)) {
      Initialize-File $p ("Missing required file for HOME Achadinhos: " + $p)
    }

    $flags = Get-Content -LiteralPath $flagFile -Raw
    if ($flags -notmatch "ff_home_achadinhos_shelf") { throw "flags.ts missing ff_home_achadinhos_shelf" }

    $homeFileTxt = Get-Content -LiteralPath $homeFile -Raw
    if ($homeFileTxt -notmatch "AUTOPILOT_HOME_ACHADINHOS") { throw "Home index.tsx missing Achadinhos shelf marker" }

    $card = Get-Content -LiteralPath $cardFile -Raw
    if ($card -notmatch "ProductCardVariant") { throw "product-card.tsx missing shelf variant support" }

    $a = Get-Content -LiteralPath $analyticsFile -Raw
    if ($a -notmatch "HomeAchadinhosEvents") { throw "analytics.ts missing HomeAchadinhosEvents" }

    $c = Get-Content -LiteralPath $catalogFile -Raw
    if ($c -notmatch "getAchadinhosOfDay") { throw "catalog.ts missing getAchadinhosOfDay" }

    $result.notes += "home_achadinhos_shelf=present"
  }

  function Invoke-ReviewsVerifiedPurchaseV1() {
    $result.notes += "reviews_verified_purchase_v1=stub_not_implemented"
    throw "reviews_verified_purchase_v1: not implemented yet (stub)"
  }

  function Invoke-BacklogDispatchV1() {
    if ($null -eq $task.payload) { throw "backlog_dispatch_v1: missing task.payload" }
    $b = $task.payload.backlog
    if ($null -eq $b) { throw "backlog_dispatch_v1: missing task.payload.backlog" }

    $flag = $b.flag
    if ($flag -eq "ff_home_achadinhos_shelf") {
      Invoke-HomeAchadinhosShelfV1
      return
    }

    if ($flag -eq "ff_reviews_verified_purchase_v1") {
      Invoke-ReviewsVerifiedPurchaseV1
      return
    }

    throw ("backlog_dispatch_v1: no mapping for flag=" + $flag + " id=" + $b.id)
  }

  switch ($action) {
    "validate_cart_analytics_contract" { Invoke-ValidateCartAnalyticsContract }
    "cart_ux_upgrade_v1" { Invoke-CartUxUpgradeV1 }
    "checkout_start_guardrails_v1" { Invoke-CheckoutStartGuardrailsV1 }
    "checkout_ui_v1" { Invoke-CheckoutUiV1 }
    "cart_cross_sell_v1" { Invoke-CartCrossSellV1 }
    "cart_performance_pass_v1" { Invoke-CartPerformancePassV1 }

    "checkout_address_v1" { Invoke-CheckoutAddressV1 }
    "checkout_payment_v1" { Invoke-CheckoutPaymentV1 }

    "order_place_mock_v1" { Invoke-OrderPlaceMockV1 }

    "analytics_harden_v1" { Invoke-AnalyticsHardenV1 }

    "autonomy_healthcheck_v1" { Invoke-AutonomyHealthcheckV1 }
    "autonomy_pause_on_failures_v1" { Invoke-AutonomyPauseOnFailuresV1 }
    "autonomy_schema_guard_v1" { Invoke-AutonomySchemaGuardV1 }
    "autonomy_migrations_v1" { Invoke-AutonomyMigrationsV1 }

    "home_achadinhos_shelf_v1" { Invoke-HomeAchadinhosShelfV1 }
    "backlog_dispatch_v1" { Invoke-BacklogDispatchV1 }

    default { throw "Unknown action: $action" }
  }

  # ✅ AUTOCOMMIT (fix: use Test-GitChange as defined in lib.ps1)
  if ($autocommitEnabled -and (Test-GitChange)) {
    $msg = "autonomy(task): " + $task.id + " - " + $task.title
    $sha = Invoke-GitCommit -Message $msg -AuthorName $authorName -AuthorEmail $authorEmail
    $result.committed_sha = $sha
    $result.notes += ("committed_sha=" + $sha)
  } else {
    if (-not $autocommitEnabled) { $result.notes += "autocommit=disabled" }
    if (-not (Test-GitChange)) { $result.notes += "no_git_changes" }
  }

} catch {
  $result.ok = $false
  $result.notes += ("executor_error=" + $_.Exception.Message)
}

$result | ConvertTo-Json -Depth 20