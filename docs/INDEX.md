# Docs — Plugaishop 2026 + MAXXIMUS (PC-only)

## Como usar (modo leigo)
1) Leia **COMEÇAR RÁPIDO** (abaixo).
2) Quando eu te pedir um arquivo, você só abre (Ctrl+P), copia e cola aqui.

---

## Começar rápido (PC-only no Windows)
- (1) Leia: `docs/maxximus/02-operacao-pc-only.md`
- (2) Use: `docs/maxximus/03-comandos-minimos.md`
- (3) Quando você disser uma meta, eu devolvo:
  - backlog + feature-flag + métricas + DoD
  - patch com arquivos completos
  - comandos git + testes + rollback

---

## Estrutura (vamos preencher em etapas)

### MAXXIMUS (autonomia)
- `docs/maxximus/01-visao-geral.md`
- `docs/maxximus/02-operacao-pc-only.md`
- `docs/maxximus/03-comandos-minimos.md`
- `docs/maxximus/04-seguranca-backup-rollback.md`
- `docs/maxximus/05-prompt-operacional.md`

### Plugaishop 2026 (app)
- `docs/plugaishop/01-norte-north-star.md`
- `docs/plugaishop/02-feature-flags.md`
- `docs/plugaishop/03-eventos-metricas.md`
- `docs/plugaishop/04-template-por-aba.md`

### Log de decisões
- `docs/decisions/DECISIONS.md`

---

## Regras fixas (não negociar)
- Layout do app congelado (só perf/robustez, sem mudar visual/estrutura).
- Incremental: não recomeçar do zero.
- Toda ideia vira: backlog + feature-flag + métrica.
- Operação atual: **PC-only (Windows)**.

---

## Próximo passo (quando você quiser)
Você vai me dizer:
- “Vamos iniciar uma Aba: <nome>”
OU
- “Meta do ciclo: <frase>”

E eu sigo o padrão: plano curto + checklist + patch completo + git + testes + rollback.
