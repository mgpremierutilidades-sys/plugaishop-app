@'
# scripts/ai/fix-all.ps1
[CmdletBinding()]
param(
  [switch]$SkipTsc,
  [switch]$FixMojibake
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[fix-all] " + $m) }

# UTF-8 best-effort (não quebra se falhar)
try { chcp 65001 | Out-Null } catch {}

$root = (Resolve-Path ".").Path

$pyRel  = "scripts/ai/patch_repo.py"
$pyPath = Join-Path $root $pyRel

if (-not (Test-Path -LiteralPath $pyPath)) {
  throw "Arquivo Python não encontrado: $pyRel (esperado em: $pyPath)."
}

# Escolhe executável Python (py -3 preferível no Windows)
$pythonCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pythonCmd = @("py", "-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonCmd = @("python")
} else {
  throw "Python não encontrado (nem 'py' nem 'python' no PATH)."
}

if ($FixMojibake) {
  Say ("Running: " + ($pythonCmd -join " ") + " " + $pyRel + " --fix-mojibake")
  & $pythonCmd[0] @($pythonCmd[1..($pythonCmd.Length-1)] | Where-Object { $_ }) $pyPath --fix-mojibake
  if ($LASTEXITCODE -ne 0) { throw "Python falhou (fix-mojibake) com exit code $LASTEXITCODE" }
}

Say ("Running: " + ($pythonCmd -join " ") + " " + $pyRel + " --apply")
& $pythonCmd[0] @($pythonCmd[1..($pythonCmd.Length-1)] | Where-Object { $_ }) $pyPath --apply
if ($LASTEXITCODE -ne 0) { throw "Python falhou (apply) com exit code $LASTEXITCODE" }

if (-not $SkipTsc) {
  Say "Running tsc..."
  & npx tsc -p . --noEmit
  if ($LASTEXITCODE -ne 0) { throw "TSC falhou com exit code $LASTEXITCODE" }
  Say "OK: tsc passou"
}

Say "Done."
'@ | Set-Content -LiteralPath .\scripts\ai\fix-all.ps1 -Encoding utf8 -NoNewline
