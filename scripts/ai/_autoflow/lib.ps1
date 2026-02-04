Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$m) { Write-Host ("[autoflow] " + $m) }

function Ensure-RepoRoot {
  $root = (git rev-parse --show-toplevel).Trim()
  Set-Location $root
  return $root
}

function Backup-File([string]$path) {
  if (!(Test-Path -LiteralPath $path)) { return }
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupDir = "scripts/ai/_backup"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $safe = ($path -replace "[/\\:]", "_")
  $dest = Join-Path $backupDir ("{0}.{1}.bak" -f $safe, $ts)
  Copy-Item -LiteralPath $path -Destination $dest -Force
  Say "backup: $path -> $dest"
}

function Append-GitIgnoreLines([string[]]$lines) {
  $gitignore = ".gitignore"
  if (!(Test-Path -LiteralPath $gitignore)) {
    "" | Set-Content -Encoding UTF8 $gitignore
  }
  $existing = Get-Content -LiteralPath $gitignore -Raw
  $toAdd = @()
  foreach ($l in $lines) {
    if ($existing -notmatch [Regex]::Escape($l)) { $toAdd += $l }
  }
  if ($toAdd.Count -gt 0) {
    Backup-File $gitignore
    "`n# --- AUTOFLOW HYGIENE ---`n" + ($toAdd -join "`n") + "`n" | Add-Content -Encoding UTF8 $gitignore
    Say "updated: .gitignore (+$($toAdd.Count) lines)"
  } else {
    Say ".gitignore OK"
  }
}

function Git-AddSafe([string[]]$paths) {
  # paths com (), [] etc: sempre usar `--` e strings separadas
  $args = @("add","--")
  $args += $paths
  & git @args | Out-Null
}

function Git-CommitSafe([string]$message) {
  $st = (git status --porcelain)
  if (!$st) { Say "nothing to commit"; return $false }

  & git commit -m $message | Out-Null
  Say "committed: $message"
  return $true
}

function Write-RunReport([hashtable]$data) {
  $out = "scripts/ai/_out/autoflow-run.json"
  $json = ($data | ConvertTo-Json -Depth 10)
  Set-Content -Encoding UTF8 -LiteralPath $out -Value $json
  Say "report: $out"
}
