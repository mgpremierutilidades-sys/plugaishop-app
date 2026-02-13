param(
  [ValidateSet("bundle","gates","apply","autopilot","stop","install-task","uninstall-task","help")]
  [string]$Mode = "bundle",

  [switch]$Fast,

  [string]$PatchFile = ".\scripts\ai\_in\patch.ps1",

  [int]$LoopSeconds = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function RepoRoot { (Resolve-Path ".").Path }
function Run-OrFail([string]$cmd) {
  Write-Host ""
  Write-Host ("$ " + $cmd)
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
}

$root = RepoRoot
Set-Location $root

$aiDir = Join-Path $root "scripts\ai"
$bundle = Join-Path $aiDir "bundle-for-chat.ps1"
$runner = Join-Path $aiDir "run_ai_patch.ps1"
$auto   = Join-Path $aiDir "autopilot.ps1"
$stop   = Join-Path $aiDir "stop-autopilot.ps1"
$install= Join-Path $aiDir "install-autopilot-task.ps1"
$uninst = Join-Path $aiDir "uninstall-autopilot-task.ps1"

function Show-Help {
  Write-Host ""
  Write-Host "USO:"
  Write-Host "  .\ai.ps1 -Mode bundle -Fast"
  Write-Host "  .\ai.ps1 -Mode gates"
  Write-Host "  .\ai.ps1 -Mode apply -PatchFile .\scripts\ai\_in\patch.ps1 -Fast"
  Write-Host "  .\ai.ps1 -Mode autopilot -LoopSeconds 20 -Fast"
  Write-Host "  .\ai.ps1 -Mode stop"
  Write-Host "  .\ai.ps1 -Mode install-task -LoopSeconds 20 -Fast"
  Write-Host "  .\ai.ps1 -Mode uninstall-task"
  Write-Host ""
}

switch ($Mode) {
  "help" { Show-Help; exit 0 }

  "bundle" {
    if (!(Test-Path $bundle)) { throw "Missing: $bundle" }
    if ($Fast) {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $bundle -ProjectRoot $root -SkipExpoDoctor -SkipNodeModulesSizeScan
    } else {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $bundle -ProjectRoot $root
    }
    exit 0
  }

  "gates" {
    Run-OrFail 'npx eslint app components context hooks lib utils types constants data scripts --fix'
    Run-OrFail 'npx prettier --write app components context hooks lib utils types constants data scripts .github README.md eslint.config.js tsconfig.json package.json'
    Run-OrFail 'npx tsc -p . --noEmit'
    Write-Host ""
    Write-Host "Gates OK."
    exit 0
  }

  "apply" {
    if (!(Test-Path $runner)) { throw "Missing: $runner" }

    if (-not [System.IO.Path]::IsPathRooted($PatchFile)) {
      $PatchFile = Join-Path $root $PatchFile
    }
    if (!(Test-Path $PatchFile)) {
      throw "PatchFile not found: $PatchFile"
    }

    if ($Fast) {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $runner -PatchFile $PatchFile -Fast
    } else {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $runner -PatchFile $PatchFile
    }
    exit 0
  }

  "autopilot" {
    if (!(Test-Path $auto)) { throw "Missing: $auto" }
    if ($Fast) {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $auto -ProjectRoot $root -LoopSeconds $LoopSeconds -Fast
    } else {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $auto -ProjectRoot $root -LoopSeconds $LoopSeconds
    }
    exit 0
  }

  "stop" {
    if (!(Test-Path $stop)) { throw "Missing: $stop" }
    pwsh -NoProfile -ExecutionPolicy Bypass -File $stop -ProjectRoot $root
    exit 0
  }

  "install-task" {
    if (!(Test-Path $install)) { throw "Missing: $install" }
    if ($Fast) {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $install -ProjectRoot $root -LoopSeconds $LoopSeconds -Fast
    } else {
      pwsh -NoProfile -ExecutionPolicy Bypass -File $install -ProjectRoot $root -LoopSeconds $LoopSeconds
    }
    exit 0
  }

  "uninstall-task" {
    if (!(Test-Path $uninst)) { throw "Missing: $uninst" }
    pwsh -NoProfile -ExecutionPolicy Bypass -File $uninst
    exit 0
  }

  default { Show-Help; throw "Invalid Mode: $Mode" }
}
