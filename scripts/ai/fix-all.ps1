param(
  [string]$ProjectRoot = "E:\plugaishop-app"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Push-Location $ProjectRoot
try {
  if (!(Test-Path ".\node_modules")) {
    Write-Host "📦 node_modules missing. Running npm ci..." -ForegroundColor Yellow
    npm ci
  }

  Write-Host "🧹 ESLint --fix..." -ForegroundColor Cyan
  npx eslint . --fix

  Write-Host "🎨 Prettier --write..." -ForegroundColor Cyan
  npx prettier . --write

  Write-Host "🧠 Typecheck (best-effort)..." -ForegroundColor Cyan
  $scripts = (npm run -s) 2>$null
  if ($scripts -match "typecheck") {
    npm run typecheck
  } elseif (Test-Path ".\tsconfig.json") {
    npx tsc -p tsconfig.json --noEmit
  } else {
    Write-Host "No typecheck script and no tsconfig.json found." -ForegroundColor Yellow
  }

  Write-Host "✅ fix-all finished." -ForegroundColor Green
}
finally {
  Pop-Location
}
