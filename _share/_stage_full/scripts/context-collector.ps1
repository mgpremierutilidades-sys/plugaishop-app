# ==========================================
# PLUGAISHOP - CONTEXT COLLECTOR v2.1.2 (PS 5.1 SAFE)
# Secure, fast, and signal-focused project context packager
# Run at repository root
# ==========================================

param(
  [string]$Root = (Get-Location).Path,
  [string]$OutDir = "",
  [switch]$SkipZip
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host ("=== {0} ===" -f $title) -ForegroundColor Cyan
}

function Ensure-OutDir([string]$dir) {
  if ([string]::IsNullOrWhiteSpace($dir)) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $dir = Join-Path $Root ("_plugaishop_context_{0}" -f $stamp)
  }
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  return (Resolve-Path $dir).Path
}

function Write-TextFile([string]$path, [string]$content) {
  $content | Out-File -FilePath $path -Encoding utf8
}

function Append-Log([string]$logPath, [string]$line) {
  $line | Out-File -FilePath $logPath -Append -Encoding utf8
}

$OutDir = Ensure-OutDir $OutDir
$logPath = Join-Path $OutDir "collection_log.txt"

Write-TextFile -path $logPath -content ("Context collector started at {0}" -f (Get-Date -Format s))

Write-Section "Environment"
$nodeCmd = (Get-Command node -ErrorAction SilentlyContinue)
$npmCmd  = (Get-Command npm  -ErrorAction SilentlyContinue)

$nodeVersion = if ($nodeCmd) { & node -v } else { "node: NOT FOUND" }
$npmVersion  = if ($npmCmd)  { & npm -v }  else { "npm: NOT FOUND" }

Write-Host ("node: {0}" -f $nodeVersion)
Write-Host ("npm:  {0}" -f $npmVersion)

Write-TextFile -path (Join-Path $OutDir "node_version.txt") -content ("node: {0}" -f $nodeVersion)
Write-TextFile -path (Join-Path $OutDir "npm_version.txt")  -content ("npm:  {0}" -f $npmVersion)

Write-Section "Git"
$gitCmd = (Get-Command git -ErrorAction SilentlyContinue)
if ($gitCmd) {
  (& git rev-parse --show-toplevel) 2>$null | Out-File -FilePath (Join-Path $OutDir "git_root.txt") -Encoding utf8
  (& git status) 2>$null | Out-File -FilePath (Join-Path $OutDir "git_status.txt") -Encoding utf8
  (& git rev-parse --abbrev-ref HEAD) 2>$null | Out-File -FilePath (Join-Path $OutDir "git_branch.txt") -Encoding utf8
  (& git log -1 --oneline) 2>$null | Out-File -FilePath (Join-Path $OutDir "git_last_commit.txt") -Encoding utf8
} else {
  Write-TextFile -path (Join-Path $OutDir "git_status.txt") -content "git: NOT FOUND"
}

Write-Section "Configs"
$cfgDir = Join-Path $OutDir "configs"
if (-not (Test-Path $cfgDir)) { New-Item -ItemType Directory -Path $cfgDir | Out-Null }

$filesToCopy = @(
  "package.json",
  "package-lock.json",
  "app.json",
  "app.config.js",
  "tsconfig.json",
  "babel.config.js",
  "metro.config.js",
  "eslint.config.js"
)

foreach ($f in $filesToCopy) {
  $src = Join-Path $Root $f
  if (Test-Path $src) {
    Copy-Item -Force $src (Join-Path $cfgDir $f)
    Append-Log -logPath $logPath -line ("OK: copied {0}" -f $f)
  } else {
    Append-Log -logPath $logPath -line ("MISSING: {0}" -f $f)
  }
}

Write-Section "Project Tree"
$treePath = Join-Path $OutDir "tree_detailed.txt"
Get-ChildItem -Force -Recurse $Root |
  Select-Object FullName, Length, LastWriteTime |
  Out-File -FilePath $treePath -Encoding utf8

Write-Section "Done"
Write-Host ("OUTDIR: {0}" -f $OutDir) -ForegroundColor Green

if (-not $SkipZip) {
  $zipPath = "{0}.zip" -f $OutDir
  if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
  Compress-Archive -Path $OutDir -DestinationPath $zipPath -Force
  Write-Host ("ZIP: {0}" -f $zipPath) -ForegroundColor Green
}
