# MAXXIMUS — Comandos mínimos (Windows) — o que você usa e o que esperar

> Você só precisa destes comandos. Sempre que eu pedir, rode exatamente como está.

## 1) Status (ver como está o sistema)
**Comando:**
- `./cognitivus status`

**O que esperar:**
- Um resumo com contagem de tarefas: queued/running/success/failed
- Quantos “workers” (no PC-only normalmente 1)

---

## 2) Definir meta (1 frase)
**Comando:**
- `./cognitivus goal "Meta do ciclo: melhorar checkout"`

**O que esperar:**
- Confirmação da meta registrada

---

## 3) Pausar (se você quiser parar tudo por um tempo)
**Comando:**
- `./cognitivus pause 2h`
ou
- `./cognitivus pause 30m`

**O que esperar:**
- O sistema “dorme” e não executa ciclos nesse período

---

## 4) Relatório (onde ver o resumo)
**Comando:**
- `./cognitivus report`

**O que esperar:**
- Caminho da pasta de relatórios (ex.: `.maxximus/reports/`)

---

## 5) Deploy (fase 2 — por enquanto não automatizado)
**Comando:**
- `./cognitivus deploy`

**Regras:**
- Se `DEPLOY_BLOCKED=true`, não deve deployar
- Só liga isso quando você autorizar explicitamente

---

## Se der erro (o que você faz)
1) Copie as últimas linhas do terminal (10–30 linhas)
2) Cole aqui
3) Eu devolvo patch + rollback
