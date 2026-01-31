# AI Governance Logs

- `decisions.log.ndjson` é **runtime** (ignorado pelo git).
- `decisions.sample.ndjson` é exemplo versionado.

Gerar + logar:
`node scripts/ai/consult-guidelines.js --ia "nexus_core" --decision "..." --impact "perf" | node scripts/ai/log-decision.js`

Relatório:
`node scripts/ai/report-guidelines.js`
