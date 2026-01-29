param(
  [ValidateSet("pre-commit","pre-push")]
  [string]$Mode = "pre-commit"
)

$ErrorActionPreference = "Stop"

function Has-Command([string]$cmd) {
  return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Read-PackageJson {
  $p = Join-Path (Get-Location).Path "package.json"
  if (-not (Test-Path $p)) { return $null }
  return Get-Content $p -Raw | ConvertFrom-Json
}

function Run([string]$label, [string]$command) {
  Write-Host "==> $label"
  Write-Host "    $command"
  iex $command
}

if (-not (Test-Path (Join-Path (Get-Location).Path "app"))) {
  throw "Execute a partir da raiz do projeto (onde existe a pasta 'app')."
}

if (-not (Has-Command "node")) { throw "Node.js não encontrado no PATH." }

$pkg = Read-PackageJson

Run "Opacity Guardrails (Modal/Overlay)" "node scripts/hooks/check-opacity-guards.mjs"

if ($pkg -and $pkg.scripts -and $pkg.scripts.typecheck) {
  Run "Typecheck" "npm run -s typecheck"
} elseif (Test-Path "tsconfig.json") {
  Run "Typecheck (tsc --noEmit)" "npx -y tsc -p tsconfig.json --noEmit"
} else {
  Write-Host "==> Typecheck: tsconfig.json não encontrado (pulando)."
}

if ($pkg -and $pkg.scripts -and $pkg.scripts.lint) {
  Run "Lint" "npm run -s lint"
} else {
  Write-Host "==> Lint: script 'lint' não encontrado (pulando)."
}

if ($Mode -eq "pre-push") {
  if ($pkg -and $pkg.scripts -and $pkg.scripts.test) {
    Run "Tests" "npm run -s test"
  } else {
    Write-Host "==> Tests: script 'test' não encontrado (pulando)."
  }
}

Write-Host "OK. Checks passaram ($Mode)."
