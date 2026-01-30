# Mapa de Rotas — Expo Router (snapshot)

## Objetivo
Ter uma lista única e confiável das rotas/abas existentes para guiar backlog, métricas e patches
sem trabalhar no escuro.

---

## Entradas principais (raiz do app)
- `app/_layout.tsx`
- `app/index.tsx`
- `app/modal.tsx`

---

## Grupo de Abas (Tabs)
Pasta: `app/(tabs)/`

### Layout das Abas
- `app/(tabs)/_layout.tsx`

### Abas existentes (rotas)
- Home: `app/(tabs)/index.tsx`
- Explore: `app/(tabs)/explore.tsx`
- Cart: `app/(tabs)/cart.tsx`  ⚠️ visual intocável (só perf/robustez)
- Orders: `app/(tabs)/orders.tsx`
- Account: `app/(tabs)/account.tsx`
- Profile: `app/(tabs)/profile.tsx`

---

## Checkout (fluxo)
Pasta: `app/checkout/`

- `app/checkout/_layout.tsx`
- `app/checkout/index.tsx`
- `app/checkout/address.tsx`
- `app/checkout/shipping.tsx`
- `app/checkout/payment.tsx`
- `app/checkout/review.tsx`
- `app/checkout/success.tsx`

---

## Orders (área e detalhes)
Pasta: `app/orders/`

- `app/orders/_layout.tsx`
- `app/orders/index.tsx`
- `app/orders/notifications.tsx`
- `app/orders/[id].tsx`

Subrotas do pedido:
- `app/orders/[id]/invoice.tsx`
- `app/orders/[id]/tracking.tsx`
- `app/orders/[id]/return.tsx`
- `app/orders/[id]/review.tsx`
- `app/orders/[id]/support.tsx`

---

## Debug
Pasta: `app/debug/`

- `app/debug/_layout.tsx`
- `app/debug/outbox.tsx`

---

## Product (PDP)
- `app/product/[id].tsx`

---

## Notas fixas
- Layout do app congelado: não alterar visual/estrutura.
- Melhorias permitidas: performance, robustez, logging, métricas e organização invisível.
