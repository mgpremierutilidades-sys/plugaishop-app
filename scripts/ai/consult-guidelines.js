#!/usr/bin/env node
/**
 * Consulta Diretrizes Mestras (repo) e calcula score simples.
 * Zero dependências. Output JSON em stdout.
 *
 * Ex:
 * node scripts/ai/consult-guidelines.js --ia "frontend_ai" --decision "Otimizar FlatList do carrinho, sem alterar UI" --impact "perf"
 */

const fs = require("fs");
const path = require("path");

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

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function nowISO() {
  return new Date().toISOString();
}

function scoreDecision({ decisionText }) {
  const t = (decisionText || "").toLowerCase();

  // Base
  let score = 60;

  // Plugaishop alignment boosts
  const boosts = [
    { k: ["performance", "perf", "otimiz", "lcp", "tti", "memo", "leak"], v: 10 },
    { k: ["robust", "crash", "fallback", "retry", "timeout"], v: 8 },
    { k: ["métrica", "metric", "evento", "event", "telemetria", "analytics"], v: 8 },
    { k: ["feature-flag", "flag", "rollout", "ab test", "a/b"], v: 8 },
    { k: ["incremental", "sem reescrever", "refactor pequeno", "patch"], v: 6 }
  ];

  for (const b of boosts) {
    if (b.k.some((kw) => t.includes(kw))) score += b.v;
  }

  // Maxximus alignment boosts
  const mx = [
    { k: ["rollback", "reverter", "toggle", "kill switch"], v: 10 },
    { k: ["teste", "test", "lint", "typecheck", "ci"], v: 8 },
    { k: ["log", "audit", "registro", "ndjson"], v: 6 }
  ];
  for (const b of mx) {
    if (b.k.some((kw) => t.includes(kw))) score += b.v;
  }

  // Hard penalties: layout freeze / UX changes
  const layoutChangeSignals = [
    "redesign",
    "mudar layout",
    "alterar layout",
    "trocar visual",
    "refazer ui",
    "nova interface",
    "novo layout",
    "reorganizar tela",
    "mudar estrutura"
  ];
  const touchedLayout = layoutChangeSignals.some((kw) => t.includes(kw));
  if (touchedLayout) score -= 35;

  // Keep within bounds
  score = Math.max(0, Math.min(100, score));

  // precisaCEO logic
  let precisaCEO = false;
  let motivoCEO = "";

  if (touchedLayout) {
    precisaCEO = true;
    motivoCEO = "Sinal de alteração de layout/estrutura (layout congelado).";
  } else if (t.includes("checkout") && (t.includes("fluxo") || t.includes("1-clique") || t.includes("one click"))) {
    precisaCEO = true;
    motivoCEO = "Mudança potencial em fluxo crítico de compra/checkout.";
  } else if (t.includes("custo") || t.includes("$") || t.includes("assinatura") || t.includes("recorrente")) {
    precisaCEO = true;
    motivoCEO = "Indício de custo recorrente/decisão comercial.";
  } else if (t.includes("segurança") || t.includes("auth") || t.includes("token") || t.includes("oauth")) {
    precisaCEO = true;
    motivoCEO = "Mudança potencialmente crítica de segurança/autenticação.";
  }

  // Recommendation
  let recomendacao = "APROVADO (autônomo).";
  if (score < 50) recomendacao = "REPROVADO (reformular antes de implementar).";
  else if (score < 80) recomendacao = "CONSULTAR PARES (segunda IA/review) antes de implementar.";
  if (precisaCEO) recomendacao = "PRECISA CEO (gate obrigatório).";

  return { score, precisaCEO, motivoCEO, recomendacao };
}

function main() {
  const args = parseArgs(process.argv);

  const ia = args.ia || "unknown_ai";
  const decision = args.decision || "";
  const impact = args.impact || "docs";

  const manifestoP = readText(path.join(process.cwd(), "docs/diretrizes/PROJETO_PLUGAISHOP_2026/MANIFESTO.md"));
  const manifestoM = readText(path.join(process.cwd(), "docs/diretrizes/PROJETO_MAXXIMUS/MANIFESTO_AUTONOMIA.md"));

  const { score, precisaCEO, motivoCEO, recomendacao } = scoreDecision({ decisionText: decision });

  const result = {
    timestamp: nowISO(),
    ia,
    impact,
    decision,
    consulted: {
      plugaishop_manifesto_loaded: manifestoP.length > 0,
      maxximus_manifesto_loaded: manifestoM.length > 0
    },
    score,
    precisaCEO,
    motivoCEO: motivoCEO || undefined,
    recomendacao
  };

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main();
