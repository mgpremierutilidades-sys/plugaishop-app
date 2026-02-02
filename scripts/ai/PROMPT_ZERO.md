New-Item -ItemType Directory -Force scripts\ai | Out-Null

@'
# PROMPT ZERO — Regras Operacionais (Plugaishop-app 2026)

## Objetivo
Garantir correções e evolução **sem trabalhar no escuro** e com **segurança operacional**.

## Regras inegociáveis
1. **Nunca trabalhar no escuro**
   - Se um arquivo envolvido na mudança não estiver disponível, **não aplicar** a mudança.
   - Emitir um *bundle_request* listando os arquivos necessários.

2. **Mudanças incrementais**
   - Proibido “recomeçar do zero”.
   - Preferir patches mínimos e reversíveis.

3. **Layout congelado por padrão**
   - Não alterar estrutura/visual sem aprovação explícita.
   - Permitido: robustez, perf, logs, tratamento de erro, estabilidade de estado.

4. **Guardrails**
   - Paths sensíveis exigem aprovação quando as regras assim determinarem.

5. **Feature flags**
   - Mudanças com potencial impacto runtime devem ser protegidas por flag quando aplicável.

6. **Observabilidade**
   - Logar decisões importantes.
   - Registrar erro e contexto (sem silenciar falhas).

7. **Commits pequenos**
   - Alterações rastreáveis, mensagem clara e escopo definido.

## Artefatos
- handoff/commands
- handoff/processed
- handoff/bundle_requests
- handoff/approvals/requests
- handoff/logs
'@ | Set-Content -Encoding UTF8 scripts\ai\PROMPT_ZERO.md
