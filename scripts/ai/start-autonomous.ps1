param(
  [string]$ProjectRoot = "E:\plugaishop-app",
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

Write-Host "[autonomous] root=$ProjectRoot"

# 1) garante que não há outra instância rodando
Get-Process pwsh -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -like "*\pwsh.exe" } |
  Stop-Process -Force -ErrorAction SilentlyContinue

# 2) sanity
if (-not (Get-Command gh  -ErrorAction SilentlyContinue)) { throw "gh CLI não encontrado" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git não encontrado" }
gh auth status | Out-Null

# 3) aviso de repo sujo (não bloqueia, mas te informa)
$dirty = (git status --porcelain)
if ($dirty) {
  Write-Host "[autonomous] ATENÇÃO: repo está com mudanças pendentes (git status --porcelain não vazio)."
  Write-Host $dirty
}

# 4) autoheal (SEM task)
& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "scripts\ai\fix-gh-queue-hard2.ps1") -ProjectRoot $ProjectRoot

# 5) inicia supervisor
& pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "scripts\ai\run-gh-queue-supervisor.ps1") `
  -ProjectRoot $ProjectRoot -LoopSeconds $LoopSeconds -Fast:$Fast
