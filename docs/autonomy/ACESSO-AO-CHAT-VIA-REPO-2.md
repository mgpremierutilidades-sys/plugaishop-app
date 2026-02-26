# ACESSO AO CHAT VIA REPO 2 — Plugaishop

## Objetivo
Este documento define o padrão oficial para:
1) traduzir requisitos de UI/UX em mudanças técnicas no app
2) criar Issues “autopilot” em sequência (labels `area:*` e `risk-*`)
3) alimentar o pipeline automatizado (Issues → backlog → autonomy cycle → PR → merge → close issue)

---

## Regras de execução
- NÃO implementar biometria real no MVP (“leitor facial” real exige câmera/permissões/SDK/back-end).
- MVP: **ABA “Scan Futurista”** com visual/efeitos que simulam scan + CTA (login/código).
- Toda mudança grande deve estar por **feature flag**.
- Sempre manter:
  - lint OK
  - typecheck OK
  - sem regressão de navegação

---

## Tradução técnica do Prompt de UI

### Nova ordem / estrutura de abas (Tabs)
**ABA 1 (nova): Scan Futurista**
- Visual totalmente diferente (HUD futurista, gradientes, shapes, scanner line, micro animações)
- Sem biometria real
- CTA: “Entrar” / “Usar código”
- Flag: `ff_scan_tab_v1`

**ABA 2 (nova): Banner**
- Tela só com banner Plugaishop (azul escuro oficial)
- Remove banner de cima do Início e move para esta aba
- Flag: `ff_banner_tab_v1`

**ABA Início**
- Manter altura/cores do header/banner, porém **sem “Plugaishop”**
- Barra de categorias branca abaixo do buscador (estilo Mercado Livre)
- Ícone “Home” (casinha) na Tab Bar
- Mais cor/vivacidade em cards (Home/Carrinho/Explorar)
- Tipografia global padronizada (fonte única, menor, headers em negrito)
- Corrigir textos/alinhamento das categorias (“Operação” etc.)
- Descer labels/textos para alinhar melhor com rodapé e padrão Explorar

**ABA Explorar**
- Ícone na tab
- Mais cores nos tiles/cards

**ABA Carrinho**
- Header alinhado ao padrão do Explorar
- Blocos: Cupom/Desconto/Frete + resumo total

**ABA Checks/Checkout**
- “FINALIZAR compra” sem corte
- Ícones nos sub-itens internos
- Mais vivacidade/cores (sem perder legibilidade)

---

## Issues autopilot (ordem recomendada)

### ISSUE 1 — Scan Futurista (MVP sem biometria real)
- Labels: `autopilot`, `area:tabs`, `risk-med`
- Flag: `ff_scan_tab_v1`
- DoD: sem crash, navegação ok, lint/typecheck ok

### ISSUE 2 — Aba Banner + remover banner do Início
- Labels: `autopilot`, `area:home`, `risk-low`
- Flag: `ff_banner_tab_v1`

### ISSUE 3 — Início: header sem “Plugaishop” + barra de categorias branca
- Labels: `autopilot`, `area:home`, `risk-med`
- Flag: `ff_home_categories_bar_v1`

### ISSUE 4 — Tab Bar: ícone Home + padronizar alinhamento
- Labels: `autopilot`, `area:tabs`, `risk-low`

### ISSUE 5 — Tipografia global (tokens) menor + headers bold
- Labels: `autopilot`, `area:ui`, `risk-med`

### ISSUE 6 — Início: corrigir textos/alinhamento das categorias
- Labels: `autopilot`, `area:home`, `risk-low`

### ISSUE 7 — Mais cor/vivacidade (Home/Carrinho/Explorar)
- Labels: `autopilot`, `area:ui`, `risk-med`

### ISSUE 8 — Início: descer labels/textos e alinhar com padrão Explorar
- Labels: `autopilot`, `area:home`, `risk-low`

### ISSUE 9 — Explorar: ícone + tiles mais vivos
- Labels: `autopilot`, `area:explore`, `risk-low`

### ISSUE 10 — Carrinho: header + cupom/desconto/frete
- Labels: `autopilot`, `area:cart`, `risk-med`

### ISSUE 11 — Checkout/Checks: header cortado + ícones + vivacidade
- Labels: `autopilot`, `area:checkout`, `risk-med`

---

## Ordem para máxima velocidade (sem desvio)
1) ISSUE 2 (Banner tab)
2) ISSUE 3 (Categorias ML-like no Início)
3) ISSUE 10 (Carrinho: cupom/frete)
4) ISSUE 11 (Checkout/Checks)
5) ISSUE 5 + ISSUE 7 (tipografia + vivacidade global)
6) ISSUE 1 (Scan Futurista)
7) ISSUE 4/6/8/9 (acabamentos)

---

## Comandos-padrão (GitHub CLI)

### Criar labels (se faltarem)
- `autopilot`, `autopilot-done`
- `area:tabs`, `area:ui`, `area:home`, `area:explore`, `area:cart`, `area:checkout`
- `risk-low`, `risk-med`, `risk-high`

### Criar issues em lote
Usar `gh issue create` com labels existentes.

---

## Observação final
Este arquivo é a referência de UI/UX + backlog autopilot para o ciclo autônomo.