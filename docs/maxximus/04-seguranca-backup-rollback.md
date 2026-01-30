# MAXXIMUS — Segurança, Backup e Rollback (PC-only)

## Objetivo
Evitar perder trabalho e evitar deploy com app quebrado.

---

## Backup (PC-only)
### Onde fica
- `.maxximus/backups/`

### Frequência
- 1x por hora (ou conforme configurado)

### O que entra no backup (MVP)
- `scripts/` (automação)
- `.maxximus/` (estado, relatórios)
- configs essenciais

> Não inclui: `node_modules/` (muito grande e reconstituível)

---

## Rollback (bloqueio de deploy)
### Quando bloquear
- Muitas tarefas falhando (ex.: lint/test/typecheck)
- Erros repetidos

### Como bloquear (regra simples)
- Flag: `DEPLOY_BLOCKED=true`

### Como desbloquear
1) Corrigir causa raiz
2) Rodar checks novamente
3) Confirmar success_rate alto
4) Voltar `DEPLOY_BLOCKED=false`

---

## Coisas que NÃO rodam sozinhas (segurança)
Até autorização explícita:
- auto-commit
- auto-merge
- auto-deploy
- alterações de rede/firewall no Windows

---

## DoD (pronto) de segurança
- Existe backup recente
- Existe caminho de rollback
- Flags definidas
