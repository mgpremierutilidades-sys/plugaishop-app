# ==========================================
# PLUGAISHOP - CONTEXT COLLECTOR v2.1.1 (OFFICIAL)
# Secure, fast, and signal-focused project context packager
# Run at repository root
# ==========================================
[CmdletBinding()]
param(
  [int]$TreeDepth = 6,
  [string]$CustomOutputPath,
  [switch]$IncludeNodeModules,
  [switch]$SkipZip,
  [string[]]$AdditionalFiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------- Configuration ----------
$root = (Get-Location).Path
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$baseOutName = "_plugaishop_context_$stamp"

$outDir = if ($CustomOutputPath) { Join-Path $CustomOutputPath $baseOutName } else { Join-Path $root $baseOutName }

# Safe exclusions
$excludePatterns = @(
  "node_modules",
  ".git",
  "dist",
  "build",
  ".expo",
  ".next",
  "android\build",
  "ios\build",
  ".turbo",
  ".cache",
  "*.log",
  "*.tmp",
  "*.temp",
  ".DS_Store",
  "Thumbs.db",
  "_plugaishop_context_*"
)

if ($IncludeNodeModules) {
  $excludePatterns = $excludePatterns | Where-Object { $_ -ne "node_modules" }
}

function Ensure-Dir([string]$p) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

function ShouldExclude([string]$relativePath) {
  foreach ($pattern in $excludePatterns) {
    if ($relativePath -like "*$pattern*") { return $true }
  }
  return $false
}

# ---------- Init ----------
Ensure-Dir $outDir
$logFile = Join-Path $outDir "collection_log.txt"
$metadataFile = Join-Path $outDir "metadata.json"

function Write-Log([string]$Message, [string]$Level = "INFO") {
  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
  Write-Host $line
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  if ($Level -eq "ERROR") { throw $Message }
}

function Test-GitRepo {
  try { git rev-parse --git-dir 2>$null | Out-Null; return $true } catch { return $false }
}

function Copy-Safe([string]$Source, [string]$Destination) {
  try {
    Ensure-Dir (Split-Path $Destination -Parent)
    Copy-Item $Source $Destination -Force -ErrorAction Stop
  } catch {
    Write-Log "Failed to copy: $Source" "WARN"
  }
}

Write-Log "Starting context collection"

# ---------- Metadata ----------
@{
  timestamp = $stamp
  projectRoot = $root
  parameters = @{
    TreeDepth = $TreeDepth
    IncludeNodeModules = $IncludeNodeModules
    SkipZip = $SkipZip
  }
  system = @{
    powershell = $PSVersionTable.PSVersion.ToString()
    os = [System.Environment]::OSVersion.VersionString
  }
} | ConvertTo-Json -Depth 4 | Set-Content $metadataFile -Encoding UTF8

# ---------- Git ----------
if (Test-GitRepo) {
  Write-Log "Collecting git metadata"
  git rev-parse --show-toplevel | Out-File (Join-Path $outDir "git_root.txt")
  git branch --show-current | Out-File (Join-Path $outDir "git_branch.txt")
  git log -1 --oneline | Out-File (Join-Path $outDir "git_last_commit.txt")
  git status --porcelain -b | Out-File (Join-Path $outDir "git_status.txt")
} else {
  Write-Log "Git not detected (ok)" "WARN"
}

# ---------- Environment ----------
node --version 2>$null | Out-File (Join-Path $outDir "node_version.txt")
npm --version 2>$null | Out-File (Join-Path $outDir "npm_version.txt")

# ---------- Tree (robust: no pipeline scriptblock parsing issues) ----------
Write-Log "Generating directory tree"
$treeFile = Join-Path $outDir "tree_detailed.txt"
"# DIRECTORY TREE`nRoot: $root`nDepth: $TreeDepth`n" | Set-Content $treeFile -Encoding UTF8

function Write-Tree([string]$Path, [int]$Depth) {
  if ($Depth -gt $TreeDepth) { return }

  $items = Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue |
    Sort-Object PSIsContainer, Name -Descending

  foreach ($it in $items) {
    $rel = $it.FullName.Substring($root.Length).TrimStart("\")
    if (ShouldExclude $rel) { continue }

    $prefix = ("  " * $Depth) + ($(if ($it.PSIsContainer) { "[D] " } else { "[F] " }))
    Add-Content -Path $treeFile -Value "$prefix$rel" -Encoding UTF8

    if ($it.PSIsContainer) {
      Write-Tree -Path $it.FullName -Depth ($Depth + 1)
    }
  }
}

Write-Tree -Path $root -Depth 0

# ---------- Configs (SAFE ONLY) ----------
Write-Log "Collecting configuration files"
$configDir = Join-Path $outDir "configs"
Ensure-Dir $configDir

$configPatterns = @(
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "tsconfig*.json",
  "app.json", "app.config.*", "expo-env.d.ts", "eas.json",
  "metro.config.*", "babel.config.*",
  ".env.example", ".env.template", ".env.sample",
  ".eslintrc*", ".prettierrc*", "eslint.config.*", "prettier.config.*"
)

foreach ($pattern in $configPatterns) {
  Get-ChildItem -Path $root -Recurse -Filter $pattern -File -ErrorAction SilentlyContinue |
    ForEach-Object {
      $rel = $_.FullName.Substring($root.Length).TrimStart("\")
      if (ShouldExclude $rel) { return }
      $dest = Join-Path $configDir $rel
      Copy-Safe -Source $_.FullName -Destination $dest
    }
}

# ---------- Routing ----------
Write-Log "Collecting routing structure"
$routingDir = Join-Path $outDir "routing"
Ensure-Dir $routingDir

foreach ($candidate in @("app", "src\app")) {
  $p = Join-Path $root $candidate
  if (Test-Path $p) {
    Copy-Item $p (Join-Path $routingDir $candidate) -Recurse -Force -ErrorAction SilentlyContinue
    break
  }
}

# ---------- Explore Focus ----------
Write-Log "Collecting Explore-related source files"
$exploreDir = Join-Path $outDir "explore"
Ensure-Dir $exploreDir

Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart("\")
    ($rel -match "(?i)^(src\\|app\\)") -and
    ($_.Extension -in ".ts",".tsx",".js",".jsx",".json") -and
    ($rel -match "(?i)explore|discover|feed|browse") -and
    -not (ShouldExclude $rel)
  } |
  ForEach-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart("\")
    $dest = Join-Path $exploreDir $rel
    Copy-Safe -Source $_.FullName -Destination $dest
  }

# ---------- Additional Files ----------
if ($AdditionalFiles -and $AdditionalFiles.Count -gt 0) {
  Write-Log "Collecting AdditionalFiles patterns"
  $customDir = Join-Path $outDir "custom"
  Ensure-Dir $customDir
  foreach ($patt in $AdditionalFiles) {
    Get-ChildItem $root -Recurse -Filter $patt -File -ErrorAction SilentlyContinue |
      ForEach-Object {
        $rel = $_.FullName.Substring($root.Length).TrimStart("\")
        if (ShouldExclude $rel) { return }
        $dest = Join-Path $customDir $rel
        Copy-Safe -Source $_.FullName -Destination $dest
      }
  }
}

# ---------- Zip ----------
if (-not $SkipZip) {
  Write-Log "Creating archive"
  $zipPath = Join-Path $root "_plugaishop_context_$stamp.zip"
  Compress-Archive -Path $outDir\* -DestinationPath $zipPath -Force
  Write-Log "Archive ready: $zipPath"
}

Write-Host "`n✔ CONTEXT COLLECTION COMPLETE"
Write-Host "Output folder: $outDir"
if (-not $SkipZip) { Write-Host "ZIP: $zipPath" }
