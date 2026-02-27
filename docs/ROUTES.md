# Routes Registry — Plugaishop

Este documento é o **mapa canônico de rotas** (Expo Router) do Plugaishop.
Regra: rotas novas relevantes devem ser registradas aqui antes do merge.

## Rotas principais (canônicas)

### Tabs
- `/(tabs)` — layout de tabs
- `/(tabs)/index` — Início
- `/(tabs)/explore` — Explorar
- `/(tabs)/cart` — Carrinho
- `/(tabs)/orders` — Pedidos
- `/(tabs)/account` — Conta (hub)
- `/(tabs)/profile` — Perfil (preferências)

### Search e Discovery
- `/search` — Busca global
- `/category/[id]` — Lista por categoria
- `/product/[id]` — Produto (PDP)

### Orders
- `/orders` — Stack de pedidos (index + details)
- `/orders/notifications` — Notificações de pedidos
- `/orders/[id]/*` — ações do pedido (support, tracking, return, review, invoice)

### Checkout (canônico)
- `/(tabs)/checkout` — fluxo de checkout canônico
- `/(tabs)/checkout/address`
- `/(tabs)/checkout/shipping`
- `/(tabs)/checkout/payment`
- `/(tabs)/checkout/review`
- `/(tabs)/checkout/success`

## Checkout (legacy / compat)
Estas rotas existem somente para compatibilidade e devem **redirecionar**:
- `/checkout` → `/(tabs)/checkout`
- `/checkout/address` → `/(tabs)/checkout/address`
- `/checkout/shipping` → `/(tabs)/checkout/shipping`
- `/checkout/payment` → `/(tabs)/checkout/payment`
- `/checkout/review` → `/(tabs)/checkout/review`
- `/checkout/success` → `/(tabs)/checkout/success`
- `/checkout/pix` → `/(tabs)/checkout/payment` (não existe pix no canônico)

## Regras
- Não duplicar a mesma intenção de fluxo em dois lugares.
- Mudanças em roteamento (risk-med+) devem vir com smoke/gate.