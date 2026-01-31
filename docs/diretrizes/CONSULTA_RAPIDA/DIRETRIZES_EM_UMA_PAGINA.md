# Diretrizes em 1 página

## Norte
Shopping Center Digital Vivo.

## Travas
- Layout congelado (visual/estrutura): NÃO alterar.
- Incremental: não reescrever do zero.
- Toda mudança: flag + métrica + rollback.

## Eventos mínimos
- view, click, add_to_cart, checkout_start, purchase, success, fail

## “Precisa de CEO” quando
- muda fluxo principal de compra/checkout
- muda visual/estrutura (layout)
- envolve custo recorrente
- envolve segurança crítica

## Padrão de decisão
Decisão → checklist → score → (autônomo | consulta pares | CEO) → log
