param(
  [string]$RepoRoot = "E:\plugaishop-app",
  [string]$OutRoot  = "$env:TEMP\plugaishop-snapshot",
  [int]$TreeDepth   = 4
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Ensure-Dir([string]$p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }
function Has-Cmd([string]$name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Safe-Copy([string]$src, [string]$dstDir) { if (Test-Path $src) { Copy-Item -LiteralPath $src -Destination $dstDir -Force } }
function Write-Log([string]$file, [string[]]$lines) { $lines | Out-File -FilePath $file -Encoding UTF8 }

$excludeRegex = '\\(node_modules|\.git|dist|build|\.expo|\.next|coverage|android\\build|ios\\Pods)\\'

if (-not (Test-Path $RepoRoot)) { throw "RepoRoot não existe: $RepoRoot" }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Ensure-Dir $OutRoot

$outDir   = Join-Path $OutRoot "snapshot-$timestamp"
$logsDir  = Join-Path $outDir "logs"
$filesDir = Join-Path $outDir "files"

Ensure-Dir $outDir
Ensure-Dir $logsDir
Ensure-Dir $filesDir

Push-Location $RepoRoot
try {
  $manifest = @()
  $manifest += "== RepoRoot =="
  $manifest += $RepoRoot
  $manifest += ""

  if (Has-Cmd git) {
    $manifest += "== Git =="
    $manifest += (git rev-parse --show-toplevel 2>&1)
    $manifest += ("branch: " + (git branch --show-current 2>&1))
    $manifest += "---- status (porcelain) ----"
    $manifest += (git status --porcelain=v1 2>&1)
    $manifest += "---- remotes ----"
    $manifest += (git remote -v 2>&1)
    $manifest += ""
  } else {
    $manifest += "git: NÃO ENCONTRADO"
    $manifest += ""
  }

  $manifest += "== Versions =="
  $manifest += (Has-Cmd node ? ("node: " + (node -v 2>&1)) : "node: NÃO ENCONTRADO")
  $manifest += (Has-Cmd npm  ? ("npm: "  + (npm -v 2>&1))  : "npm: NÃO ENCONTRADO")
  if (Has-Cmd pwsh) { $manifest += ("pwsh: " + (pwsh -v 2>&1)) } else { $manifest += "pwsh: powershell clássico" }
  $manifest += ""
  $manifest += "== Top-level folders =="
  $manifest += (Get-ChildItem -Directory | Select-Object -ExpandProperty Name | Sort-Object)
  $manifest += ""
  Write-Log (Join-Path $logsDir "00-manifest.txt") $manifest

  $treeLines = Get-ChildItem -Recurse -Depth $TreeDepth -Force |
    Where-Object { $_.FullName -notmatch $excludeRegex } |
    Select-Object -ExpandProperty FullName
  Write-Log (Join-Path $logsDir "01-tree-depth-$TreeDepth.txt") $treeLines

  $keyFiles = @(
    "package.json","app.json","app.config.js","app.config.ts","tsconfig.json",
    "babel.config.js","metro.config.js",
    "eslint.config.js","eslint.config.mjs",
    ".eslintrc",".eslintrc.js",".eslintrc.json",".eslintrc.yml",".eslintrc.yaml",
    "README.md","CONTRIBUTING.md"
  )
  foreach ($f in $keyFiles) { Safe-Copy (Join-Path $RepoRoot $f) $filesDir }

  $maybeRouterFiles = @(
    "expo-router.json","router.config.js","router.config.ts",
    "app\_layout.tsx","app\_layout.jsx","app\(tabs)\_layout.tsx","app\(tabs)\_layout.jsx"
  )
  foreach ($rf in $maybeRouterFiles) { Safe-Copy (Join-Path $RepoRoot $rf) $filesDir }

  $toolsPath = Join-Path $RepoRoot "tools"
  if (Test-Path $toolsPath) {
    $toolsTree = Get-ChildItem -Path $toolsPath -Recurse -Depth 6 -Force |
      Where-Object { $_.FullName -notmatch $excludeRegex } |
      Select-Object -ExpandProperty FullName
    Write-Log (Join-Path $logsDir "02-tools-tree-depth-6.txt") $toolsTree
  } else {
    Write-Log (Join-Path $logsDir "02-tools-tree-depth-6.txt") @("tools/ NÃO EXISTE")
  }

  if ((Test-Path (Join-Path $RepoRoot "package.json")) -and (Has-Cmd node)) {
    $scriptsOut = node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts||{}, null, 2))" 2>&1
    Write-Log (Join-Path $logsDir "03-npm-scripts.json") @($scriptsOut)
  } else {
    Write-Log (Join-Path $logsDir "03-npm-scripts.json") @("package.json ou node ausente; não foi possível extrair scripts.")
  }

  if (Has-Cmd rg) {
    $patternsTools = "autonomy|orchestrator|maxximus|tasks\.json|backlog\.queue|executor\.ps1|apply patch|git commit|typecheck|lint"
    $patternsApp   = "checkout|review|OrderDraft|discount|total|cart"
    Write-Log (Join-Path $logsDir "04-rg-tools.txt") @(rg -n $patternsTools tools -S 2>&1)
    Write-Log (Join-Path $logsDir "05-rg-app-hotspots.txt") @(rg -n $patternsApp app components lib utils -S 2>&1)
  } else {
    Write-Log (Join-Path $logsDir "04-rg-tools.txt") @("rg (ripgrep) NÃO ENCONTRADO. (Opcional)")
    Write-Log (Join-Path $logsDir "05-rg-app-hotspots.txt") @("rg (ripgrep) NÃO ENCONTRADO. (Opcional)")
  }

  $appPath = Join-Path $RepoRoot "app"
  if (Test-Path $appPath) {
    Write-Log (Join-Path $logsDir "06-app-tree-depth-4.txt") @(
      Get-ChildItem -Path $appPath -Recurse -Depth 4 -Force |
      Where-Object { $_.FullName -notmatch $excludeRegex } |
      Select-Object -ExpandProperty FullName
    )
  } else { Write-Log (Join-Path $logsDir "06-app-tree-depth-4.txt") @("app/ NÃO EXISTE") }

  $componentsPath = Join-Path $RepoRoot "components"
  if (Test-Path $componentsPath) {
    Write-Log (Join-Path $logsDir "07-components-tree-depth-4.txt") @(
      Get-ChildItem -Path $componentsPath -Recurse -Depth 4 -Force |
      Where-Object { $_.FullName -notmatch $excludeRegex } |
      Select-Object -ExpandProperty FullName
    )
  } else { Write-Log (Join-Path $logsDir "07-components-tree-depth-4.txt") @("components/ NÃO EXISTE") }

  if ((Has-Cmd npm) -and (Test-Path (Join-Path $RepoRoot "package.json"))) {
    $gateOut = @()
    $gateOut += "== npm run -s lint =="
    try { $gateOut += (npm run -s lint 2>&1 | Select-Object -First 400) } catch { $gateOut += ("ERROR: " + $_.Exception.Message) }
    $gateOut += ""
    $gateOut += "== npm run -s typecheck =="
    try { $gateOut += (npm run -s typecheck 2>&1 | Select-Object -First 400) } catch { $gateOut += ("ERROR: " + $_.Exception.Message) }
    Write-Log (Join-Path $logsDir "08-gates-truncated.txt") $gateOut
  } else {
    Write-Log (Join-Path $logsDir "08-gates-truncated.txt") @("npm/package.json ausente; gates não executados.")
  }

  $zipPath = Join-Path $OutRoot "plugaishop-snapshot-$timestamp.zip"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath -Force

  Write-Host ""
  Write-Host "OK ✅ Snapshot gerado:"
  Write-Host $zipPath
}
finally { Pop-Location }
