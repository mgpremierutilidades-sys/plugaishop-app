# Runbook de scripts (o que rodar e quando)

## Objetivo
Você (leigo) saber o mínimo:
- qual comando usar
- para quê serve
- quando rodar

---

## Comandos principais (npm)

### Rodar o app (padrão)
- `npm start`
- Faz: abre o Expo.

### Dev limpando cache
- `npm run dev`
- Faz: `expo start -c` (resolve muitos bugs de cache).

### Dev na rede local (LAN)
- `npm run dev:lan`
- Faz: Expo via LAN.

### Dev via tunnel
- `npm run dev:tunnel`
- Faz: tunnel do Expo (útil em redes com bloqueio).

### Android (nativo)
- `npm run android`
- Faz: `expo run:android`

### Web
- `npm run web`

---

## Qualidade (sempre antes de enviar mudanças)

### Lint
- `npm run lint`
- Faz: `expo lint`

### Testes
- `npm test`
- Faz: `jest --watchAll`
- Observação: watchAll fica “rodando”. Para sair: Ctrl+C.

---

## Automação do projeto (importante para eu trabalhar por você)

### Coleta de contexto (principal)
- `npm run context`
- Faz: roda `scripts/context-collector.ps1`
- Uso: gera um “pacote” para eu enxergar o projeto sem você ficar caçando arquivos.

---

## Regra simples (modo leigo)
Se eu falar:
- “roda **context**” → `npm run context`
- “roda **lint**” → `npm run lint`
- “roda **test**” → `npm test`
- “roda **dev**” → `npm run dev`
