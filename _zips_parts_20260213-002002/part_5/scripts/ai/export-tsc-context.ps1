# scripts/ai/export-tsc-context.ps1
[CmdletBinding()]
param(
  [string]$OutFile = "scripts/ai/_out/tsc-context-bundle.txt"
)

$ErrorActionPreference = "Stop"

function Write-Log([string]$m) { Write-Host ("[export-tsc] " + $m) }

# Console/arquivos em UTF-8
try {
  chcp 65001 | Out-Null
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
} catch {}

$root = (Resolve-Path ".").Path
$outPath = Join-Path $root $OutFile
$outDir  = Split-Path $outPath -Parent

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Log "Running tsc..."
$tscText = ""
try {
  $tscText = (npx tsc -p . --noEmit 2>&1) | Out-String
} catch {
  $tscText = ($_ | Out-String)
}

# Extrai caminhos de arquivo do output do tsc (inclui padrão: "path(line,col): error TSxxxx")
$paths = New-Object System.Collections.Generic.HashSet[string]

$regexes = @(
  # Windows path
  '(?m)^(?<p>[A-Za-z]:[\\/][^:\r\n]+)\(\d+,\d+\):\s+error\s+TS\d+',
  # Repo-relative (ex: app/(tabs)/index.tsx(236,7): error ...)
  '(?m)^(?<p>[^:\r\n]+)\(\d+,\d+\):\s+error\s+TS\d+'
)

foreach ($rx in $regexes) {
  foreach ($m in [regex]::Matches($tscText, $rx)) {
    $p = $m.Groups["p"].Value.Trim()
    if (-not $p) { continue }

    # Normaliza para fullpath
    $full = $p
    if ($p -notmatch '^[A-Za-z]:[\\/]') {
      $full = Join-Path $root $p
    }

    # Resolve symlinks/.. se possível
    try { $full = (Resolve-Path -LiteralPath $full).Path } catch {}

    $null = $paths.Add($full)
  }
}

# Também inclui types/order.ts (quase sempre é a raiz dos erros atuais)
$mustHave = @(
  (Join-Path $root "types\order.ts"),
  (Join-Path $root "context\CartContext.tsx"),
  (Join-Path $root "app\(tabs)\cart.tsx"),
  (Join-Path $root "app\(tabs)\index.tsx"),
  (Join-Path $root "app\checkout\review.tsx")
)

foreach ($m in $mustHave) {
  if (Test-Path -LiteralPath $m) { $null = $paths.Add((Resolve-Path -LiteralPath $m).Path) }
}

$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine("## plugaishop tsc context bundle")
$null = $sb.AppendLine("repo: " + $root)
$null = $sb.AppendLine("generatedAt: " + (Get-Date -Format o))
$null = $sb.AppendLine("")
$null = $sb.AppendLine("### TSC OUTPUT (raw)")
$null = $sb.AppendLine("-----BEGIN TSC-----")
$null = $sb.AppendLine($tscText)
$null = $sb.AppendLine("-----END TSC-----")
$null = $sb.AppendLine("")

function Append-File([string]$fullPath) {
  $rel = $fullPath
  if ($fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $fullPath.Substring($root.Length).TrimStart("\","/")
  }

  $null = $sb.AppendLine("### FILE: " + $rel)

  if (-not (Test-Path -LiteralPath $fullPath)) {
    $null = $sb.AppendLine("### STATUS: MISSING")
    $null = $sb.AppendLine("")
    return
  }

  $null = $sb.AppendLine("### STATUS: OK")
  $null = $sb.AppendLine("-----BEGIN TS-----")
  try {
    $content = Get-Content -LiteralPath $fullPath -Raw
    $null = $sb.AppendLine($content)
  } catch {
    $null = $sb.AppendLine("<<FAILED TO READ>>")
    $null = $sb.AppendLine($_ | Out-String)
  }
  $null = $sb.AppendLine("-----END TS-----")
  $null = $sb.AppendLine("")
}

Write-Log ("Bundling " + $paths.Count + " file(s)...")
foreach ($p in $paths) { Append-File $p }

Set-Content -LiteralPath $outPath -Value $sb.ToString() -Encoding utf8
Write-Log ("Wrote: " + $OutFile)
