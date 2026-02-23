function Read-Json([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-Json([string]$Path, [object]$Value, [int]$Depth = 50) {
  ($Value | ConvertTo-Json -Depth $Depth) | Out-File -FilePath $Path -Encoding UTF8 -Force
}

function Ensure-File([string]$Path, [string]$Message) {
  if (!(Test-Path $Path)) { throw $Message }
}

function Git-HasChanges() {
  $out = git status --porcelain
  return ($out -and $out.Trim().Length -gt 0)
}

function Git-HeadSha() {
  return (git rev-parse HEAD).Trim()
}

function Git-Commit([string]$Message, [string]$AuthorName = $null, [string]$AuthorEmail = $null) {
  git add -A | Out-Null
  if ($AuthorName -and $AuthorEmail) {
    git -c user.name="$AuthorName" -c user.email="$AuthorEmail" commit -m $Message | Out-Null
  } else {
    git commit -m $Message | Out-Null
  }
  return Git-HeadSha
}

function Wrap-TrackCallsWithFlag(
  [string]$FilePath,
  [string]$FlagName,
  [string]$TrackPrefix = "cart_"
) {
  Ensure-File $FilePath ("Missing file: " + $FilePath)

  $lines = Get-Content -LiteralPath $FilePath
  $changed = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    # Só linhas com track("cart_...") (ou track('cart_...'))
    if ($line -match 'track\(\s*["' + "'" + ']' + [regex]::Escape($TrackPrefix)) {

      # Já está guardado?
      if ($line -match [regex]::Escape("isFlagEnabled(`"$FlagName`")") -or
          $line -match [regex]::Escape("isFlagEnabled('$FlagName')") -or
          $line -match [regex]::Escape('isFlagEnabled("' + $FlagName + '")') -or
          $line -match [regex]::Escape("isFlagEnabled(")) {
        continue
      }

      # Converte "track(...);" -> "if (isFlagEnabled("ff")) track(...);"
      $lines[$i] = 'if (isFlagEnabled("' + $FlagName + '")) ' + $line.TrimStart()
      $changed = $true
    }
  }

  if ($changed) {
    Set-Content -LiteralPath $FilePath -Value $lines -Encoding UTF8
  }

  return $changed
}

function Ensure-IsFlagEnabledImport([string]$FilePath) {
  Ensure-File $FilePath ("Missing file: " + $FilePath)

  $text = Get-Content -LiteralPath $FilePath -Raw

  # Já importa?
  if ($text -match 'isFlagEnabled') {
    # Pode ser uso sem import; vamos checar import explícito
    if ($text -match 'import\s*\{\s*isFlagEnabled\s*\}\s*from\s*["' + "'" + '].*/constants/flags["' + "'" + ']\s*;') {
      return $false
    }
  }

  # Se não usa isFlagEnabled no arquivo, não faz nada
  if (!($text -match 'isFlagEnabled\(')) { return $false }

  # Inserir import no topo, após a última linha de import existente
  $lines = Get-Content -LiteralPath $FilePath
  $lastImportIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*import\s+') { $lastImportIdx = $i }
  }

  $importLine = 'import { isFlagEnabled } from "../../constants/flags";'

  # Se é cart.tsx (app/(tabs)/cart.tsx) o relative é ../../constants/flags (já usado)
  if ($FilePath -match 'app[\\/]\(tabs\)[\\/]cart\.tsx$') {
    $importLine = 'import { isFlagEnabled } from "../../constants/flags";'
  }

  # Se é context/CartContext.tsx, relative é ../constants/flags
  if ($FilePath -match 'context[\\/]CartContext\.tsx$') {
    $importLine = 'import { isFlagEnabled } from "../constants/flags";'
  }

  # Já existe import de flags com path diferente?
  if ($text -match 'from\s*["' + "'" + '].*constants/flags["' + "'" + ']\s*;') {
    return $false
  }

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