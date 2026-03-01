Contexto

O projeto não possui runner de testes (Jest/Vitest), mas tivemos mudanças relevantes em rotas (/search, /category/[id], shims de /checkout/*).

Precisamos de um gate mínimo para prevenir regressões de roteamento.

O que foi feito

Adicionado smoke test em Node (sem dependências):

valida existência das rotas críticas

valida que shims em app/checkout/* contêm router.replace() para /(tabs)/checkout/*

Integrado ao pipeline existente via npm run ci.

Como testar

npm run ci (inclui lint + typecheck + smoke)

Ou npm run autotest:smoke isolado

Risco / rollback

risk-low (somente scripts)

rollback: revert do PR