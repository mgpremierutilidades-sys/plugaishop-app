param(
  [string]$ProjectRoot = "E:\plugaishop-app"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $ProjectRoot
try {
  if (!(Test-Path ".\node_modules")) {
    Write-Host "node_modules missing. Running npm ci..."
    npm ci
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }

  # Ensure prettier is installed to avoid npx prompt
  npm ls prettier --silent 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing prettier (devDependency) to avoid interactive prompts..."
    npm install -D prettier@^3.8.1
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }

  Write-Host "Running ESLint --fix (scoped)..."
  npx eslint "app" "components" "context" "hooks" "lib" "utils" --fix
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host "Running Prettier --write (scoped)..."
  npx prettier --write `
    "app/**/*.{ts,tsx,js,jsx,json,md}" `
    "components/**/*.{ts,tsx,js,jsx,json,md}" `
    "context/**/*.{ts,tsx,js,jsx,json,md}" `
    "hooks/**/*.{ts,tsx,js,jsx,json,md}" `
    "lib/**/*.{ts,tsx,js,jsx,json,md}" `
    "utils/**/*.{ts,tsx,js,jsx,json,md}" `
    "types/**/*.{ts,tsx}" `
    "constants/**/*.{ts,tsx,js,jsx,json}" `
    ".github/**/*.{yml,yaml,md}" `
    "*.json" "*.js" "*.ts" "*.tsx" "*.md"
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
