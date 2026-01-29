# scripts/patch-cart-footer-padding.ps1
# Fix invisível: evita que o conteúdo da SectionList fique escondido atrás do footer (position:absolute)
# - adiciona footerHeight state
# - mede altura do footer via onLayout
# - aplica paddingBottom dinâmico no contentContainerStyle
#
# Rollback: restaure o backup em _share\backups\...

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path ".").Path
$Target = Join-Path $Root "app\(tabs)\cart.tsx"

if (-not (Test-Path $Target -PathType Leaf)) {
  throw "Arquivo não encontrado: $Target"
}

# Backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $Root "_share\backups\cart-footer-padding-$stamp\app\(tabs)"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -LiteralPath $Target -Destination (Join-Path $backupDir "cart.tsx.bak") -Force

$raw = Get-Content -LiteralPath $Target -Raw
$changed = $false

# 1) Inject footerHeight state logo após couponMsg (existe no seu arquivo)
$needleState = 'const \[couponMsg, setCouponMsg\] = useState<string>\(""\);'
if ($raw -match $needleState) {
  $replacement = '$&' + "`r`n" + '  const [footerHeight, setFooterHeight] = useState<number>(0);'
  $raw2 = [regex]::Replace($raw, $needleState, $replacement, 1)
  if ($raw2 -ne $raw) { $raw = $raw2; $changed = $true }
} else {
  throw "Não achei a linha couponMsg para inserir footerHeight. Arquivo divergiu."
}

# 2) Footer: medir altura com onLayout
$raw2 = [regex]::Replace(
  $raw,
  '<ThemedView\s+style=\{styles\.footer\}\s*>',
  '<ThemedView style={styles.footer} onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>',
  1
)
if ($raw2 -ne $raw) { $raw = $raw2; $changed = $true }

# 3) SectionList: paddingBottom dinâmico (mantém mínimo 260 do seu style atual)
$raw2 = [regex]::Replace(
  $raw,
  'contentContainerStyle=\{styles\.listContent\}',
  'contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(footerHeight + 16, 260) }]}',
  1
)
if ($raw2 -ne $raw) { $raw = $raw2; $changed = $true }

if (-not $changed) {
  Write-Host "Nenhuma alteração aplicada (talvez já esteja corrigido)."
  exit 0
}

Set-Content -LiteralPath $Target -Value $raw -NoNewline

Write-Host "OK: Patch aplicado em app/(tabs)/cart.tsx"
Write-Host "Backup em: $backupDir"
