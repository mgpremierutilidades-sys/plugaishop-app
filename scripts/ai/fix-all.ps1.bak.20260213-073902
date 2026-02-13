param(
  [string]$ProjectRoot = "E:\plugaishop-app"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Has-Cmd($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Ensure-NodeModules {
  if (!(Test-Path ".\node_modules")) {
    Write-Host "node_modules missing. Running npm ci..." -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed ($LASTEXITCODE)" }
  }
}

function Ensure-Prettier {
  # garante prettier local para n?o pedir install no npx
  if (!(Test-Path ".\node_modules\.bin\prettier") -and !(Test-Path ".\node_modules\.bin\prettier.cmd")) {
    Write-Host "Prettier missing. Installing as devDependency..." -ForegroundColor Yellow
    npm i -D prettier
    if ($LASTEXITCODE -ne 0) { throw "npm i -D prettier failed ($LASTEXITCODE)" }
  }
}

Push-Location $ProjectRoot
try {
  Ensure-NodeModules
  Ensure-Prettier

  Write-Host "Running ESLint --fix (scoped)..." -ForegroundColor Cyan
  npx eslint "app" "components" "context" "hooks" "lib" "utils" --fix
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host "Running Prettier --write (scoped)..." -ForegroundColor Cyan
  npx prettier "app" "components" "context" "hooks" "lib" "utils" --write
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host "Typecheck (tsc --noEmit)..." -ForegroundColor Cyan
  if (Test-Path ".\tsconfig.json") {
    npx tsc -p tsconfig.json --noEmit
    if ($LASTEXITCODE -ne 0) { exit 1 }
  } else {
    Write-Host "No tsconfig.json found, skipping typecheck." -ForegroundColor Yellow
  }

  Write-Host "fix-all finished." -ForegroundColor Green
  exit 0
}
finally {
  Pop-Location
}
