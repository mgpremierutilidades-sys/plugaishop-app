param(
  [switch]$WebOnly
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Read version from package.json (sem depender de npm)
$pkgPath = Join-Path $projectRoot "package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$appVersion = $pkg.version

# Git SHA (fallback seguro)
$gitSha = "nogit"
try {
  $sha = (git rev-parse --short HEAD 2>$null)
  if ($sha) { $gitSha = $sha.Trim() }
} catch {}

# Timestamp
$now = Get-Date
$stamp = $now.ToString("yyyyMMdd-HHmmss")

# Output dirs
$artifactsDir = Join-Path $projectRoot "artifacts\support"
$distDir = if ($WebOnly) { Join-Path $projectRoot "dist-web" } else { Join-Path $projectRoot "dist-support" }
$metaPath = Join-Path $projectRoot "support-meta.json"

New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null

# 1) Export
if ($WebOnly) {
  Write-Host "[support-artifact] Export web -> dist-web"
  npm run support:bundle:web | Out-Host
} else {
  Write-Host "[support-artifact] Export all -> dist-support"
  npm run support:bundle | Out-Host
}

if (-not (Test-Path $distDir)) {
  throw "Export não gerou a pasta esperada: $distDir"
}

# 2) Meta
$meta = [ordered]@{
  app        = $pkg.name
  version    = $appVersion
  git_sha    = $gitSha
  created_at = $now.ToString("o")
  node       = (node -v)
  npm        = (npm -v)
  mode       = if ($WebOnly) { "web" } else { "all" }
  dist_dir   = (Split-Path -Leaf $distDir)
}

$meta | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $metaPath

# 3) Zip name
$baseName = if ($WebOnly) { "support-web" } else { "support" }
$zipName = "{0}-v{1}-{2}-{3}.zip" -f $baseName, $appVersion, $gitSha, $stamp
$zipPath = Join-Path $artifactsDir $zipName

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

# 4) Zip dist + meta.json no mesmo nível
$tempDir = Join-Path $projectRoot "_tmp_support_artifact"
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Copy-Item -Recurse -Force (Join-Path $distDir "*") $tempDir
Copy-Item -Force $metaPath (Join-Path $tempDir "meta.json")

Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -Force

# Cleanup
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
Remove-Item -Force $metaPath -ErrorAction SilentlyContinue

Write-Host "[support-artifact] OK -> $zipPath"
