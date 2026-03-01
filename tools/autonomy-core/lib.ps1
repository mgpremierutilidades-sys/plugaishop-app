# tools/autonomy-core/lib.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Read-Json([string]$Path) {
  if (!(Test-Path -LiteralPath $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-Json([string]$Path, [object]$Value, [int]$Depth = 50) {
  ($Value | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $Path -Encoding UTF8 -Force
}

function Initialize-File([string]$Path, [string]$Message) {
  if (!(Test-Path -LiteralPath $Path)) { throw $Message }
}

function Test-GitChanges {
  $out = git status --porcelain
  return ($out -and $out.Trim().Length -gt 0)
}

# compat: alguns scripts antigos podem chamar no singular
function Test-GitChange {
  return (Test-GitChanges)
}

function Get-GitHeadSha {
  return (git rev-parse HEAD).Trim()
}

function Invoke-GitCommit {
  param(
    [Parameter(Mandatory = $true)][string]$Message,
    [string]$AuthorName = $null,
    [string]$AuthorEmail = $null
  )

  git add -A | Out-Null

  if ($AuthorName -and $AuthorEmail) {
    git -c user.name="$AuthorName" -c user.email="$AuthorEmail" commit -m $Message | Out-Null
  } else {
    git commit -m $Message | Out-Null
  }

  return (Get-GitHeadSha)
}

function Protect-TrackCallsWithFlag {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string]$FlagName,
    [string]$TrackPrefix = "cart_"
  )

  Initialize-File $FilePath ("Missing file: " + $FilePath)

  $lines = Get-Content -LiteralPath $FilePath
  $changed = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    if ($line -match 'track\(\s*["' + "'" + ']' + [regex]::Escape($TrackPrefix)) {
      # Já está guardado?
      if ($line -match 'isFlagEnabled\(') { continue }

      $lines[$i] = 'if (isFlagEnabled("' + $FlagName + '")) ' + $line.TrimStart()
      $changed = $true
    }
  }

  if ($changed) {
    Set-Content -LiteralPath $FilePath -Value $lines -Encoding UTF8
  }

  return $changed
}

function Add-IsFlagEnabledImport {
  param([Parameter(Mandatory = $true)][string]$FilePath)

  Initialize-File $FilePath ("Missing file: " + $FilePath)

  $text = Get-Content -LiteralPath $FilePath -Raw

  # Se não usa isFlagEnabled no arquivo, não faz nada
  if (!($text -match 'isFlagEnabled\(')) { return $false }

  # Já existe import de constants/flags?
  if ($text -match 'from\s*["' + "'" + '].*constants/flags["' + "'" + ']\s*;') { return $false }

  $lines = Get-Content -LiteralPath $FilePath
  $lastImportIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*import\s+') { $lastImportIdx = $i }
  }

  # Heurística simples de caminho relativo
  $importLine = 'import { isFlagEnabled } from "../../constants/flags";'
  if ($FilePath -match 'context[\\/]CartContext\.tsx$') { $importLine = 'import { isFlagEnabled } from "../constants/flags";' }
  if ($FilePath -match 'app[\\/]\(tabs\)[\\/]checkout[\\/].*\.tsx$') { $importLine = 'import { isFlagEnabled } from "../../../constants/flags";' }

  $newLines = @()
  if ($lastImportIdx -ge 0) {
    $newLines += $lines[0..$lastImportIdx]
    $newLines += $importLine
    if ($lastImportIdx + 1 -lt $lines.Count) {
      $newLines += $lines[($lastImportIdx + 1)..($lines.Count - 1)]
    }
  } else {
    $newLines += $importLine
    $newLines += $lines
  }

  Set-Content -LiteralPath $FilePath -Value $newLines -Encoding UTF8
  return $true
}