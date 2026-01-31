# Diretrizes Mestras (Plugaishop 2026 + Maxximus)

Este diretório é a **constituição operacional** do projeto.

## Estrutura
- `PROJETO_PLUGAISHOP_2026/` → O QUE construir (produto, UX, conversão, performance)
- `PROJETO_MAXXIMUS/` → COMO construir (autonomia, logs, rollback, verificação cruzada)
- `INTERSECAO_DIRETRIZES/` → como os dois sistemas se conectam
- `CONSULTA_RAPIDA/` → 1-pager + checklist pre-implementação

## Regras críticas (não negociáveis)
- Layout congelado: **não alterar estrutura/visual**; apenas correções invisíveis (perf/robustez).
- Toda ideia vira: **backlog + feature-flag + métrica**.
- Toda mudança deve ter: **plano de rollback**.

## Ferramentas
Scripts em `scripts/ai/` automatizam:
- score de alinhamento
- indicação se precisa de CEO
- log de decisões (NDJSON)

> Execução:
`node scripts/ai/consult-guidelines.js --ia "frontend_ai" --decision "..." --impact "perf"`
