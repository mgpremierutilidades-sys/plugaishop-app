# Estrutura do repositório (snapshot) — plugaishop-app (Windows)

> Fonte: listagem do diretório raiz em 2026-01-29.

## Objetivo
Ter um “mapa” para consultar rapidamente onde cada coisa vive, sem adivinhação.

---

## Pastas principais (raiz)

### `app/`
- Rotas do Expo Router.
- Observação: regra do projeto: respeitar estrutura atual (layout congelado).

### `components/`
- Componentes globais na raiz (regra fixa: manter aqui).

### `src/`
- Código de apoio/organização (depende do seu padrão atual).
- Importante: não mover sem motivo.

### `context/`
- Contextos (estado global, providers).

### `hooks/`
- Hooks reutilizáveis.

### `utils/`
- Utilitários (helpers, formatações, etc).

### `types/`
- Tipos TypeScript compartilhados.

### `assets/`
- Imagens, ícones, fontes.

### `constants/`
- Constantes do app (tokens, defaults, enums).

### `data/`
- Dados mock/local, seeds, etc.

---

## Pastas de plataforma

### `android/`
- Código nativo Android (expo run:android).

---

## Pastas “operacionais”

### `.vscode/`
- Config do VS Code (tasks/settings). Vamos mexer só com cuidado.

### `.github/`
- CI/CD (actions).

### `scripts/`
- Scripts de automação (já existe `context-collector.ps1` e `reset-project.js`).

### `.githooks/`
- Hooks de git.

---

## Pastas geradas / não versionáveis

### `node_modules/`
- Dependências.

### `.expo/`
- Cache do Expo.

---

## Arquivos importantes (raiz)

- `package.json` — scripts e deps
- `tsconfig.json` — config TS
- `eslint.config.js` — lint
- `app.json` — config Expo
- `expo-env.d.ts` — types Expo
- `APLICAR_PATCH.md` — instruções internas
- `_export_cart_etapa24/` e `.zip` — export (não tocar sem pedido explícito)

---

## Próximo passo
Para eu criar backlog por Aba com precisão, vamos usar:
- `npm run context` (já existe)
e você cola aqui o resultado do terminal (e/ou arquivo gerado).
