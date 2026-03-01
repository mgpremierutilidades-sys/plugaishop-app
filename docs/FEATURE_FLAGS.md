# Feature Flags Registry — Plugaishop

Este documento é o **registro canônico** de flags do app.
Regra: qualquer novo `isFlagEnabled("...")` deve ser registrado aqui **antes do merge**.

## Convenções
- Prefixo obrigatório: `ff_`
- Sufixo de versão: `_v1`, `_v2`...
- Default: `OFF` a menos que explicitamente promovido.
- Cada flag deve ter: **Owner, Área, Risco, Default, Rollout, Métricas, Rollback**.

---

## Flags

### ff_cart_persist_v1
- **Área:** cart
- **Risco:** low
- **Default:** OFF
- **Objetivo:** persistir carrinho em storage.
- **Rollout:** ON por ambiente/branch após validação.
- **Métricas:** `cart_persist_success/fail`
- **Rollback:** setar OFF.

### ff_cart_rehydration_hardened
- **Área:** cart
- **Risco:** low
- **Default:** OFF
- **Objetivo:** hydration determinística e resiliente.
- **Métricas:** `cart_rehydration_success/fail`
- **Rollback:** OFF.

### ff_cart_analytics_v1
- **Área:** cart
- **Risco:** low
- **Default:** OFF
- **Objetivo:** eventos do carrinho.
- **Rollback:** OFF.

### ff_cart_action_lock
- **Área:** cart
- **Risco:** low
- **Default:** OFF
- **Objetivo:** prevenir double tap em ações críticas.
- **Métricas:** `cart_double_action_prevented`
- **Rollback:** OFF.

### ff_pdp_v1
- **Área:** product
- **Risco:** low
- **Default:** OFF
- **Objetivo:** habilitar PDP.
- **Métricas:** `pdp_view`, `pdp_add_to_cart_*`, `pdp_buy_now_*`
- **Rollback:** OFF.

### ff_pdp_buy_now_v1
- **Área:** product
- **Risco:** low
- **Default:** OFF
- **Objetivo:** CTA “Comprar agora”.
- **Métricas:** `pdp_buy_now_*`
- **Rollback:** OFF.

### ff_pdp_shipping_cep_v1
- **Área:** product/checkout
- **Risco:** low
- **Default:** OFF
- **Objetivo:** cálculo de frete por CEP na PDP.
- **Métricas:** `pdp_shipping_quote`
- **Rollback:** OFF.

### ff_reviews_verified_purchase_v1
- **Área:** reviews
- **Risco:** low
- **Default:** OFF
- **Objetivo:** filtros/badges “compra verificada”.
- **Rollback:** OFF.

### ff_orders_notifications_badge_v1
- **Área:** orders
- **Risco:** low
- **Default:** OFF
- **Objetivo:** badge de notificações no tab Pedidos.
- **Métricas:** `orders_badge_loaded`
- **Rollback:** OFF.

### ff_banner_tab_v1
- **Área:** tabs/home
- **Risco:** low
- **Default:** OFF
- **Objetivo:** aba Banner dedicada e remover banner do topo do Início.
- **Métricas:** `banner_tab_viewed`
- **Rollback:** OFF.

---

## Processo
1) Ao criar flag nova:
   - adiciona entrada aqui
   - adiciona métrica mínima (view/click)
2) Antes do merge:
   - rodar `pwsh ./scripts/ai/flags-registry.ps1`
   - resolver “flags usadas mas não registradas”