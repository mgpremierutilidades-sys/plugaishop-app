import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function p(rel) {
  return path.join(repoRoot, rel);
}

function exists(rel) {
  return fs.existsSync(p(rel));
}

function read(rel) {
  return fs.readFileSync(p(rel), "utf8");
}

function fail(msg) {
  console.error(`❌ AUTOTEST(SMOKE): ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function assertExists(rel) {
  if (!exists(rel)) {
    fail(`Arquivo não encontrado: ${rel}`);
  } else {
    ok(`Existe: ${rel}`);
  }
}

function assertContains(rel, needle) {
  if (!exists(rel)) {
    fail(`Arquivo não encontrado para inspeção: ${rel}`);
    return;
  }
  const txt = read(rel);
  if (!txt.includes(needle)) {
    fail(`Conteúdo esperado não encontrado em ${rel}: "${needle}"`);
  } else {
    ok(`Conteúdo OK em ${rel}: contém "${needle}"`);
  }
}

/**
 * Smoke checklist (rotas críticas já introduzidas nos PRs recentes)
 * - search
 * - category
 * - checkout shims (legacy -> tabs)
 */
const mustExist = [
  // Search
  "app/search.tsx",

  // Category route
  "app/category/[id].tsx",

  // Tabs checkout canonical (existência)
  "app/(tabs)/checkout/index.tsx",
  "app/(tabs)/checkout/address.tsx",
  "app/(tabs)/checkout/shipping.tsx",
  "app/(tabs)/checkout/payment.tsx",
  "app/(tabs)/checkout/review.tsx",
  "app/(tabs)/checkout/success.tsx",

  // Legacy checkout stack
  "app/checkout/_layout.tsx",
  "app/checkout/index.tsx",
  "app/checkout/address.tsx",
  "app/checkout/shipping.tsx",
  "app/checkout/payment.tsx",
  "app/checkout/review.tsx",
  "app/checkout/success.tsx",
  "app/checkout/pix.tsx",
];

for (const rel of mustExist) assertExists(rel);

// Validate shim redirects (string-level; zero deps; catches accidental edits)
assertContains("app/checkout/index.tsx", 'router.replace("/(tabs)/checkout"');
assertContains(
  "app/checkout/address.tsx",
  'router.replace("/(tabs)/checkout/address"'
);
assertContains(
  "app/checkout/shipping.tsx",
  'router.replace("/(tabs)/checkout/shipping"'
);
assertContains(
  "app/checkout/payment.tsx",
  'router.replace("/(tabs)/checkout/payment"'
);
assertContains(
  "app/checkout/review.tsx",
  'router.replace("/(tabs)/checkout/review"'
);
assertContains(
  "app/checkout/success.tsx",
  'router.replace("/(tabs)/checkout/success"'
);
// pix shim intentionally targets payment
assertContains("app/checkout/pix.tsx", 'router.replace("/(tabs)/checkout/payment"');

if (process.exitCode) {
  console.error("\n🚫 AUTOTEST(SMOKE) falhou. Corrija os itens acima.");
  process.exit(1);
}

console.log("\n🎉 AUTOTEST(SMOKE) passou.");