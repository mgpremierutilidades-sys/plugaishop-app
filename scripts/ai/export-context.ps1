param(
  [string]$ProjectRoot = "E:\plugaishop-app",
  [string]$OutFile = "scripts\ai\_out\context-bundle.txt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section($title) {
  Add-Content -Path $OutFile -Value "`n===================="
  Add-Content -Path $OutFile -Value $title
  Add-Content -Path $OutFile -Value "====================`n"
}

Push-Location $ProjectRoot
try {
  New-Item -ItemType Directory -Force -Path (Split-Path $OutFile) | Out-Null
  Set-Content -Path $OutFile -Value ("Context Bundle - " + (Get-Date).ToString("s"))

  Write-Section "PATH"
  Add-Content $OutFile "ProjectRoot: $ProjectRoot"

  Write-Section "GIT STATUS"
  Add-Content $OutFile (git status 2>&1 | Out-String)

  Write-Section "GIT LOG (-25)"
  Add-Content $OutFile (git log --oneline -25 2>&1 | Out-String)

  Write-Section "NODE / NPM"
  Add-Content $OutFile ("node: " + (node -v 2>&1))
  Add-Content $OutFile ("npm : " + (npm -v 2>&1))

  Write-Section "PACKAGE.JSON (HEADERS)"
  if (Test-Path ".\package.json") {
    $pkg = Get-Content ".\package.json" -Raw
    Add-Content $OutFile ($pkg.Substring(0, [Math]::Min(6000, $pkg.Length)))
  } else {
    Add-Content $OutFile "package.json not found."
  }

  Write-Section "TSCONFIG (HEADERS)"
  if (Test-Path ".\tsconfig.json") {
    $tsc = Get-Content ".\tsconfig.json" -Raw
    Add-Content $OutFile ($tsc.Substring(0, [Math]::Min(6000, $tsc.Length)))
  } else {
    Add-Content $OutFile "tsconfig.json not found."
  }

  Write-Section "TREE (TOP LEVEL)"
  Add-Content $OutFile (Get-ChildItem -Force | Select-Object Name, Mode, Length | Format-Table | Out-String)

  Write-Section "TABS TARGET FILES (EXIST?)"
  $tabs = @(
    "app\(tabs)\index.tsx",
    "app\(tabs)\explore.tsx",
    "app\(tabs)\cart.tsx"
  )
  foreach ($t in $tabs) {
    $p = Join-Path $ProjectRoot $t
    Add-Content $OutFile ("- " + $t + " => " + (Test-Path $p))
  }

  Write-Host "✅ Context bundle generated: $OutFile"
}
finally {
  Pop-Location
}
