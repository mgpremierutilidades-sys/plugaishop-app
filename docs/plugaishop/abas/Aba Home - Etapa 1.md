# Aba Home - Etapa 1

## Aba: Home (Tabs / index)

### Objetivo (1 frase)
Aumentar descoberta e clique em produtos com carregamento rápido e rastreio confiável **sem alterar layout/estrutura**.

---

## Escopo da Etapa 1 (MVP “invisível”)
1) Padronizar eventos da Home no padrão do projeto:
- `view`
- `click` (produto)
- `fail` (erro relevante na tela)

2) Medir performance básica:
- `time_to_interactive` (TTI) ou proxy equivalente já existente no app

3) Feature-flag + rollback:
- tudo desligado por default, liga via flag e desliga sem redeploy (quando possível)

---

## Must / Should / Could
- **Must**
  - Disparar `view` uma vez por foco de tela (sem duplicar em re-render)
  - Disparar `click` ao abrir produto (card)
  - Capturar falhas relevantes (`fail`) sem quebrar UX

- **Should**
  - Medir `time_to_interactive` (TTI) sob flag
  - Deduplicar eventos (anti-spam) e reduzir payload

- **Could**
  - Cache/otimização de lista (somente perf/robustez, sem mexer em UI)

---

## Feature flags
- `FF_ANALYTICS_EVENTS` (default **false**) — liga/desliga coleta de eventos
- `FF_HOME_EVENTS_V1` (default **false**) — liga apenas a instrumentação da Home
- (opcional) `FF_TTI_V1` (default **false**) — liga apenas TTI

> Regra: se a infra atual tiver flags em dois mecanismos (env e runtime), esta etapa usa o mecanismo existente, sem reescrever do zero. Apenas adiciona “facade” se necessário.

---

## Eventos (padrão canônico)
### view
- name: `view`
- props mínimas:
  - `screen: "home"`
  - `ts` (auto)

### click
- name: `click`
- props mínimas:
  - `screen: "home"`
  - `target: "product_card"`
  - `productId`
  - `position` (opcional)

### fail
- name: `fail`
- props mínimas:
  - `screen: "home"`
  - `scope: "home_load" | "home_render" | "home_action"`
  - `message` (curta)
  - `code` (opcional)

---

## North Star + métricas
- **North Star:** `home_product_click_rate`
- **Métricas (2–4):**
  - `time_to_interactive_ms` (quando `FF_TTI_V1` ON)
  - `home_error_rate` (fail por sessão / view)
  - `home_product_click_rate` (click / view)
  - (opcional) `home_scroll_depth` (se houver sinal simples sem UI change)

---

## DoD
- Compila
- Lint ok
- Typecheck ok
- Sem regressão visual (layout congelado)
- Flags com fallback/rollback definidos
- Eventos verificados em DEV (console/log local) e prontos para pipeline real

---

## Plano de implementação (incremental, PR curto)
1) Implementar helpers de tracking específicos da Home (sem tocar UI).
2) Adicionar `view` no lifecycle correto (foco de tela).
3) Adicionar `click` em interação existente (card produto).
4) Adicionar captura de `fail` apenas onde já existe try/catch ou erro exposto.
5) Validar em dev + manter tudo atrás de `FF_HOME_EVENTS_V1`.

---

## Riscos / mitigação
- **Risco:** duplicar eventos em re-render  
  **Mitigação:** dedupe por foco + guard por ref
- **Risco:** impacto de performance por tracking  
  **Mitigação:** flag default off + payload mínimo
- **Risco:** divergência de nomes de eventos (telemetry vs analytics)  
  **Mitigação:** mapear para canônico nesta etapa, sem refactor global

---

## Rollback
- Desligar `FF_HOME_EVENTS_V1` (e/ou `FF_ANALYTICS_EVENTS`)
- Se necessário, reverter commit do PR
