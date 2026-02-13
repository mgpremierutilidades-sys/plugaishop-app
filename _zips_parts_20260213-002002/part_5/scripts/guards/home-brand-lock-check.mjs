// scripts/guards/home-brand-lock-check.mjs
// Guard definitivo: Home deve ter APENAS 1 bloco de marca (banner do topo).
// Regras atuais:
// 1) Não pode haver texto "PLUGAISHOP"/"PLUGAI" como título abaixo do banner
// 2) Não pode usar banner-splash.png dentro da Home (logo no meio)
// 3) Não pode reintroduzir título type="title" com marca

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOME_FILE = path.join(ROOT, "app", "(tabs)", "index.tsx");

function fail(msg) {
  console.error("\n❌ HOME BRAND LOCK GUARD FAILED\n");
  console.error(msg);
  console.error("\nArquivo:", HOME_FILE, "\n");
  process.exit(1);
}

function ok(msg) {
  console.log("✅", msg);
}

if (!fs.existsSync(HOME_FILE)) {
  fail(
    "Não encontrei app/(tabs)/index.tsx. Ajuste o path do guard ou verifique o repo.",
  );
}

const src = fs.readFileSync(HOME_FILE, "utf8");

// Heurísticas fortes e simples (não dependem de AST/Jest)
const banned = [
  {
    id: "BANNER_SPLASH_IN_HOME",
    test: /banner-splash\.png/i,
    message:
      'Não use "banner-splash.png" na Home. Isso reintroduz a marca no meio da tela.',
  },
  {
    id: "TITLE_PLUGAISHOP",
    test: /type\s*=\s*["']title["'][^>]*>[\s\n]*PLUGAISHOP[\s\n]*</i,
    message:
      'Não renderize "PLUGAISHOP" como título na Home. A marca deve aparecer apenas no banner do topo.',
  },
  {
    id: "TITLE_PLUGAI",
    test: /type\s*=\s*["']title["'][^>]*>[\s\n]*PLUGAI[\s\n]*</i,
    message:
      'Não renderize "PLUGAI" como título na Home. A marca deve aparecer apenas no banner do topo.',
  },
  {
    id: "TEXT_PLUGAI_SHOP_DUP",
    test: />[\s\n]*PLUGAI[\s\n]*SHOP[\s\n]*</i,
    message:
      'Não renderize texto "PLUGAI SHOP" dentro do conteúdo da Home. Use apenas o banner do topo.',
  },
];

const hits = banned.filter((r) => r.test.test(src));

if (hits.length > 0) {
  const details = hits.map((h) => `- [${h.id}] ${h.message}`).join("\n");

  fail(
    `Foram detectadas regressões de "marca duplicada" na Home:\n\n${details}\n\nComo corrigir:\n- Remova o título/branding duplicado do corpo\n- Mantenha a marca apenas no banner do topo\n- Use elementos neutros no hero (sem logo)\n`,
  );
}

ok("Home Brand Lock OK (nenhuma marca duplicada detectada).");
