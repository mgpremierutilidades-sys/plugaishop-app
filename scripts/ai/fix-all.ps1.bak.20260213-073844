param(
  [string]$ProjectRoot = "E:\plugaishop-app"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Push-Location $ProjectRoot
try {
  if (!(Test-Path ".\node_modules")) {
    Write-Host "node_modules missing. Running npm ci..."
    npm ci
  }

  Write-Host "Running ESLint --fix..."
  npx eslint "app" "components" "context" "hooks" "lib" "utils" --fix
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host "Running Prettier --write..."
  npx prettier "app" "components" "context" "hooks" "lib" "utils" --write
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host "Typecheck (best-effort)..."
  $scripts = (npm run -s) 2>$null
  if ($scripts -match "typecheck") {
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { exit 1 }
  } elseif (Test-Path ".\tsconfig.json") {
    npx tsc -p tsconfig.json --noEmit
    if ($LASTEXITCODE -ne 0) { exit 1 }
  } else {
    Write-Host "No typecheck script and no tsconfig.json found."
  }

  Write-Host "fix-all finished."
  exit 0
}
finally {
  Pop-Location
}


