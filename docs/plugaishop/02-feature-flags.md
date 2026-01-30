# Feature Flags — padrão do Plugaishop

## Convenção
- Nome: `FF_` + UPPER_SNAKE_CASE
- Default: `false`
- Rollout: 0% → 10% → 50% → 100%

## Regras
- Toda feature nova atrás de flag
- Toda flag tem:
  - métrica principal
  - fallback
  - rollback

## Exemplos
- `FF_SOCIAL_PROOF_HOME`
- `FF_TRUST_BADGES_CHECKOUT`
- `FF_SMART_DISCOVERY_FEED`
