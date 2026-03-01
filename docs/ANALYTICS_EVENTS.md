# Analytics Events Registry — Plugaishop

Este documento é o **registro canônico** de eventos de analytics disparados via `track("...")`.
Regra: qualquer novo evento deve ser registrado aqui **antes do merge**.

## Convenções
- evento em `snake_case`
- prefixo por domínio quando fizer sentido: `cart_*`, `pdp_*`, `orders_*`, `checkout_*`, `search_*`, `account_*`, `profile_*`
- cada evento deve ter: **Área, Quando dispara, Payload, Métrica derivada, Dono, Risco/PII**

---

## Eventos

### search_viewed
- **Área:** search
- **Quando:** ao abrir `/search`
- **Payload:** `{ }`
- **Métrica:** visitas na busca
- **PII:** não

### search_query_changed
- **Área:** search
- **Quando:** query >= 2 chars
- **Payload:** `{ q_len }`
- **PII:** não (não enviar query crua)

### explore_search_entry_clicked
- **Área:** explore
- **Quando:** usuário toca “Buscar” no Explore
- **Payload:** `{ source }`
- **PII:** não

### category_viewed
- **Área:** explore
- **Quando:** abre `/category/:id`
- **Payload:** `{ category_id, items_count }`
- **PII:** não

### category_product_clicked
- **Área:** explore
- **Quando:** clique em produto numa categoria
- **Payload:** `{ category_id, product_id }`
- **PII:** não

### cart_view
- **Área:** cart
- **Quando:** abre carrinho
- **Payload:** `{ }`
- **PII:** não

### cart_mutation
- **Área:** cart
- **Quando:** alteração no carrinho
- **Payload:** `{ reason, items_count }`
- **PII:** não

### cart_persist_success / cart_persist_fail
- **Área:** cart
- **Quando:** persistência storage
- **Payload:** `{ items_count }`
- **PII:** não

### cart_rehydration_success / cart_rehydration_fail
- **Área:** cart
- **Quando:** rehydration do storage
- **Payload:** `{ items_count }` / `{ message }`
- **PII:** não

### cart_totals_computed
- **Área:** cart
- **Quando:** totals mudam
- **Payload:** `{ items_count, qty, subtotal, freight, total }`
- **PII:** não

### pdp_view
- **Área:** product
- **Quando:** abre PDP (flag ON)
- **Payload:** `{ product_id, source }`
- **PII:** não

### pdp_qty_change
- **Área:** product
- **Quando:** usuário altera qty
- **Payload:** `{ product_id, qty, source }`
- **PII:** não

### pdp_add_to_cart_attempt / success / fail
- **Área:** product
- **Quando:** CTA adicionar
- **Payload:** `{ product_id, price, qty, source }`
- **PII:** não

### pdp_buy_now_attempt / success / fail
- **Área:** product
- **Quando:** CTA comprar agora
- **Payload:** `{ product_id, price, qty, source }`
- **PII:** não

### pdp_shipping_quote
- **Área:** product
- **Quando:** calcular frete por CEP
- **Payload:** `{ product_id, source, cep_prefix, price, deadline, method, subtotal }`
- **PII:** não (não enviar CEP completo)

### orders_badge_loaded
- **Área:** orders
- **Quando:** badge recalculado
- **Payload:** `{ unread_count }`
- **PII:** não

### order_return_view
- **Área:** orders
- **Quando:** abre tela de devolução
- **Payload:** `{ order_id }`
- **PII:** atenção (order_id interno)

### order_review_view
- **Área:** orders
- **Quando:** abre tela de avaliação
- **Payload:** `{ order_id }`
- **PII:** atenção (order_id interno)

### checkout_route_shim_redirect
- **Área:** checkout
- **Quando:** rota legacy `/checkout/*` redireciona
- **Payload:** `{ from, to }`
- **PII:** não