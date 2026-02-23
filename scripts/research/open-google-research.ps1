# scripts/research/open-google-research.ps1
# Abre um pacote de pesquisas no navegador para benchmark (e-commerce + gamificação).
# Objetivo: coletar padrões e virar tickets no ops/backlog.queue.yml.

param(
  [switch]$Fast
)

$queries = @(
  "best ecommerce app ux trust signals verified purchase reviews returns",
  "social commerce app discovery feed conversion best practices",
  "tiktok shop app product detail page trust badges shipping returns",
  "shopee app gamification coins vouchers daily check in missions",
  "mercado livre app meli+ loyalty subscription benefits",
  "amazon app add to cart checkout friction reduction patterns",
  "best mobile app gamification streak missions rewards ecommerce"
)

if ($Fast) { $queries = $queries[0..2] }

foreach ($q in $queries) {
  $url = "https://www.google.com/search?q=" + [Uri]::EscapeDataString($q)
  Start-Process $url
  Start-Sleep -Milliseconds 250
}

Write-Host "OK - tabs abertas."
