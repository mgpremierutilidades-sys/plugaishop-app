# Manifesto — Maxximus (Autonomia entre Máquinas)

## Filosofia
Máquinas executam e se verificam; humanos definem direção e aprovam o essencial.

## Regras de Autonomia (níveis)
- Nível 1 (autônomo): bugfix, perf, robustez, testes, refactors internos.
- Nível 2 (semi): features novas dentro do escopo definido + flags + métricas.
- Nível 3 (CEO): mudanças de fluxo crítico, UX principal, custos recorrentes, decisões de segurança.

## Regras de Segurança Operacional
- Toda mudança tem rollback.
- Toda decisão fica registrada (log append-only).
- Verificação cruzada: nada crítico sem revisão por “segunda IA”.

## Comunicação (alto nível)
Padrão de comunicação e sincronia pode usar: WebSockets + REST local, filas e sync entre máquinas. :contentReference[oaicite:2]{index=2}
