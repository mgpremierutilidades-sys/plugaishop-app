# Backlog por Aba — Plugaishop 2026 (snapshot inicial)

> Regra: layout congelado. Tudo aqui é “invisível” (perf/robustez/telemetria) até você autorizar UI.

---

## Aba: Home (Tabs / index)
### Objetivo (1 frase)
Aumentar descoberta e clique em produtos com carregamento rápido e rastreio confiável.

### MVP
- Instrumentar eventos: `view`, `click` (produto), `add_to_cart` (quando existir)
- Medir tempo de carregamento (perf básica)

### Must / Should / Could
- Must: tracking de `view` e `click` + erros
- Should: medir `time_to_interactive` e latências
- Could: cache local de lista (se já existir fetch)

### Flags
- `FF_ANALYTICS_EVENTS` (default false)

### Eventos
- view: `home_view`
- click: `home_product_click`
- add_to_cart: `home_add_to_cart`

### North Star + métricas
- North Star: `home_product_click_rate`
- Métricas: `time_to_interactive`, `error_rate`, `home_scroll_depth` (opcional)

### DoD
- Compila
- Lint ok
- Sem regressão visual
- Flag com fallback (desliga tudo)

---

## Aba: Explore (Tabs / explore)
### Objetivo
Aumentar descoberta via busca/exploração medindo intenção.

### MVP
- Eventos de `view` e `click` em cards/itens
- Log de “nada encontrado” (se tiver busca)

### Flags
- `FF_ANALYTICS_EVENTS`

### Eventos
- view: `explore_view`
- click: `explore_item_click`

### Métricas
- `explore_click_rate`, `error_rate`, `time_to_interactive`

### DoD
- Sem regressão visual + checks ok

---

## Aba: Cart (Tabs / cart) ⚠️ visual intocável
### Objetivo
Reduzir erros e aumentar início de checkout sem mudar layout.

### MVP
- Eventos: `view`, `add_to_cart` (se aplicável), `checkout_start`
- Melhorias de performance: memoização, evitar re-render desnecessário (somente se seguro)

### Flags
- `FF_ANALYTICS_EVENTS`
- `FF_CART_PERF_GUARDS` (default false)

### Eventos
- view: `cart_view`
- click: `cart_checkout_start` (checkout_start)
- fail: `cart_error`

### Métricas
- `checkout_start_rate`, `cart_error_rate`, `cart_render_time` (opcional)

### DoD
- Visual 100% igual
- Perf/robustez comprovável
- Rollback via flags

---

## Aba: Orders (Tabs / orders)
### Objetivo
Aumentar confiança pós-compra com rastreio de acesso e falhas.

### MVP
- Eventos: `orders_view`, `order_open`
- Log de falhas de carregamento

### Flags
- `FF_ANALYTICS_EVENTS`

### Eventos
- view: `orders_view`
- click: `order_open` (abrir detalhe)

### Métricas
- `orders_open_rate`, `error_rate`, `time_to_interactive`

### DoD
- Checks ok + sem regressão

---

## Aba: Account (Tabs / account)
### Objetivo
Reduzir fricção de conta com telemetria de navegação.

### MVP
- `account_view`, `account_action_click`

### Flags
- `FF_ANALYTICS_EVENTS`

### Métricas
- `account_action_rate`, `error_rate`

---

## Aba: Profile (Tabs / profile)
### Objetivo
Medir engajamento em perfil/config sem mudar UI.

### MVP
- `profile_view`, `profile_action_click`

### Flags
- `FF_ANALYTICS_EVENTS`

### Métricas
- `profile_action_rate`, `error_rate`

---

## Fluxo: Checkout (app/checkout/*)
### Objetivo
Aumentar `purchase_success_rate` e reduzir falhas por etapa.

### MVP
- Eventos por etapa: `checkout_start`, `step_view`, `step_success`, `step_fail`

### Flags
- `FF_ANALYTICS_EVENTS`
- `FF_CHECKOUT_GUARDS` (default false)

### Eventos (mínimo)
- `checkout_start`
- `checkout_address_view/success/fail`
- `checkout_shipping_view/success/fail`
- `checkout_payment_view/success/fail`
- `checkout_review_view/success/fail`
- `purchase_success` (na `success.tsx`)
- `purchase_fail` (quando aplicável)

### Métricas
- `checkout_completion_rate`
- `dropoff_by_step`
- `error_rate`

### DoD
- Sem regressão visual
- Fallback por flag
- Logs úteis para diagnóstico

---

## PDP: Product (app/product/[id].tsx)
### Objetivo
Aumentar `add_to_cart_rate` e reduzir falhas de carregamento do produto.

### MVP
- `product_view`, `add_to_cart`, `fail`

### Flags
- `FF_ANALYTICS_EVENTS`

### Métricas
- `add_to_cart_rate`, `product_load_error_rate`, `time_to_interactive`
