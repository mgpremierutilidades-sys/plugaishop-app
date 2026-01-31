#!/usr/bin/env node
/**
 * Gera um checklist preenchido (MD) com base em uma decisão curta.
 *
 * Ex:
 * node scripts/ai/check-alignment.js --decision "Otimizar lista do carrinho sem alterar UI" > /tmp/check.md
 */

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function yesNo(pred) {
  return pred ? "[x]" : "[ ]";
}

function main() {
  const args = parseArgs(process.argv);
  const d = (args.decision || "").toLowerCase();

  const touchedLayout =
    d.includes("alterar layout") ||
    d.includes("mudar layout") ||
    d.includes("trocar visual") ||
    d.includes("redesign") ||
    d.includes("nova interface");

  const hasMetrics = d.includes("métrica") || d.includes("metric") || d.includes("evento") || d.includes("event") || d.includes("analytics");
  const hasRollback = d.includes("rollback") || d.includes("reverter") || d.includes("kill switch") || d.includes("toggle");
  const hasTests = d.includes("teste") || d.includes("test") || d.includes("lint") || d.includes("typecheck");

  const md = `# Checklist Pre-Implementação (gerado)

**Decisão:** ${args.decision || "(vazio)"}

## 1) Alinhamento Plugaishop 2026
- ${yesNo(!touchedLayout)} Melhora UX sem mexer no layout?
- ${yesNo(d.includes("convers") || d.includes("conv"))} Melhora conversão (direto/indireto)?
- ${yesNo(d.includes("perf") || d.includes("otimiz") || d.includes("robust") || d.includes("crash"))} Melhora performance/robustez?
- ${yesNo(hasMetrics)} Tem métrica e evento(s) definidos?
- ${yesNo(d.includes("incremental") || d.includes("patch") || d.includes("refactor"))} Está incremental (sem reescrever)?

## 2) Alinhamento Maxximus
- ${yesNo(true)} Pode ser executada autonomamente (nível 1/2)?
- ${yesNo(hasRollback)} Tem plano de rollback?
- ${yesNo(true)} Será registrada no log de decisões?
- ${yesNo(true)} Terá verificação cruzada (2ª IA / review)?

## 3) Técnica
- ${yesNo(true)} Compila/linta
- ${yesNo(hasTests)} Teste mínimo/checagem executada
- ${yesNo(!touchedLayout)} Sem regressão visual (layout congelado)
- ${yesNo(true)} Sem impacto de memória desnecessário

## 4) Gate CEO
- ${yesNo(touchedLayout || d.includes("checkout") || d.includes("custo") || d.includes("assinatura") || d.includes("segurança"))} Precisa de CEO?
Motivo:
`;

  process.stdout.write(md);
}

main();
