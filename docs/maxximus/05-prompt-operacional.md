# Prompt Operacional — regras fixas para nunca esquecer

## Contexto fixo do app
- Plugaishop-app 2026: Expo/React Native + TypeScript + Expo Router
- Padrão Marketplace (Mercado Livre/Shopee/Amazon)
- NORTE: “Shopping Center Digital Vivo” (social commerce + descoberta + confiança + conversão)

## Regras de engenharia (imutáveis)
1) Layout congelado: nunca alterar estrutura/visual; só correções invisíveis (perf/robustez)
2) Incremental: não recomeçar do zero
3) Entrega: sempre arquivos COMPLETOS com PATH correto, prontos para colar
4) Sem trabalhar no escuro: se precisar, pedir TODOS os arquivos envolvidos antes
5) Respeitar convenções/paths fixados do projeto (components/ na raiz, AppHeader, theme default+imports)
6) Carrinho `app/(tabs)/cart.tsx`: visual intocável; só perf; “voltar” = back

## Modo de resposta (sempre)
- Plano curto (3–7 passos) + checklist
- Arquivos necessários (mínimo possível)
- Patch com arquivos inteiros
- Comandos Git + commit msg
- Testes + riscos + rollback (flags/fallback)
- Por Aba: objetivo (1 frase), MVP, Must/Should/Could, flags, eventos, North Star + métricas, DoD

## Operação atual
- PC-only (Windows)
- Automações perigosas desligadas por padrão:
  - AUTONOMOUS_DEPLOY=false
  - AUTONOMOUS_COMMIT=false
