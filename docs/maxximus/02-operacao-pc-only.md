# MAXXIMUS — Operação PC-only (Windows) — passo a passo (modo leigo)

## Objetivo
Rodar o “modo MAXXIMUS” só no PC para organizar trabalho, reduzir erros e acelerar evolução do Plugaishop 2026
sem complicar com notebook/servidores externos.

---

## O que você PRECISA fazer (mínimo)
Você só vai fazer 3 coisas:

1) **Iniciar o sistema**
2) **Dizer uma meta em 1 frase**
3) **(Opcional) ver status/relatório**

Eu faço o resto: transformo em backlog + flags + métricas + patches prontos.

---

## Conceitos (sem jargão)
- **Meta**: o que você quer melhorar (“melhorar checkout”).
- **Tarefa**: um comando automático (“rodar lint”, “rodar testes”).
- **Flag**: um “botão liga/desliga” de feature para evitar risco.
- **Relatório**: um resumo do que funcionou, falhou e o próximo passo.
- **Rollback**: como desfazer rápido se der ruim (geralmente desativar flag / reverter commit).

---

## Regras fixas (não negociar)
- **Layout do app congelado**: não mudar visual/estrutura; só performance/robustez.
- **Incremental**: não reescrever do zero.
- Toda ideia vira: **backlog + feature-flag + métrica**.

---

## Operação PC-only (como vai funcionar)
### 1) Você inicia (quando pedirmos)
- Você roda um comando de “start”.
- O sistema passa a:
  - rodar checks (lint/typecheck/test) conforme configurado
  - registrar resultados
  - gerar relatório em pasta

### 2) Você define a meta (1 frase)
Exemplos:
- “Meta do ciclo: melhorar performance da Home”
- “Meta do ciclo: reduzir erro no checkout”
- “Vamos iniciar uma Aba: Cart”

### 3) Eu devolvo (sempre no mesmo formato)
- Plano curto + checklist
- Arquivos necessários (mínimo possível)
- Patch (arquivos completos com PATH)
- Comandos Git + commit message
- Testes + riscos + rollback (flags/fallback)

---

## Quando algo der errado (o que você faz)
Você só faz isto:

1) Copia o erro do terminal (as últimas linhas)
2) Cola aqui
3) Eu respondo com o patch e o rollback

> Importante: não tente “consertar por tentativa e erro”.

---

## Como você me manda arquivos (forma mais rápida)
Quando eu pedir um arquivo:

1) No VS Code, pressione **Ctrl+P**
2) Digite o nome (ex.: `package.json`)
3) Enter
4) **Ctrl+A**, **Ctrl+C**
5) Cole aqui

Se não existir, você responde: **“não existe”**.

---

## Itens que ficam DESLIGADOS por padrão (segurança)
Até você autorizar explicitamente:
- Auto-commit
- Auto-merge
- Auto-deploy
- Qualquer execução que altere rede/firewall do Windows

Tudo isso só entra com flag + checklist.

---

## Próximo passo
Quando você estiver pronto, você me diz UMA destas frases:

- “Meta do ciclo: ______”
OU
- “Vamos iniciar uma Aba: ______”

E eu começo a executar o fluxo com você fazendo o mínimo.
