#!/usr/bin/env node
import fs from "node:fs";

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function fail(msg) {
  console.error(`\n[smoke] FAIL: ${msg}\n`);
  process.exit(1);
}

function main() {
  // Baseado no seu tree real (C:\plugaishop-app\app)
  const requiredFiles = [
    "app/_layout.tsx",
    "app/modal.tsx",

    "app/(tabs)/_layout.tsx",
    "app/(tabs)/index.tsx",
    "app/(tabs)/explore.tsx",
    "app/(tabs)/cart.tsx",
    "app/(tabs)/account.tsx",
    "app/(tabs)/profile.tsx",

    "app/(tabs)/checkout/_layout.tsx",
    "app/(tabs)/checkout/index.tsx",
    "app/(tabs)/checkout/address.tsx",
    "app/(tabs)/checkout/shipping.tsx",
    "app/(tabs)/checkout/payment.tsx",
    "app/(tabs)/checkout/review.tsx",
    "app/(tabs)/checkout/success.tsx",

    // app/checkout (no seu tree só existem estes)
    "app/checkout/_layout.tsx",
    "app/checkout/pix.tsx",
    "app/checkout/export-debug.tsx",

    // orders (no seu tree existe como pasta)
    "app/orders/_layout.tsx",
    "app/orders/index.tsx",
    "app/orders/notifications.tsx",
    "app/orders/[id].tsx",
    "app/orders/[id]/invoice.tsx",
    "app/orders/[id]/return.tsx",
    "app/orders/[id]/review.tsx",
    "app/orders/[id]/support.tsx",
    "app/orders/[id]/tracking.tsx"
  ];

  const missing = requiredFiles.filter((p) => !exists(p));
  if (missing.length) {
    fail(`rotas/arquivos ausentes:\n- ${missing.join("\n- ")}`);
  }

  // Contratos críticos
  const critical = [
    "constants/theme.ts",
    "components/global-chrome.tsx",
    "context/CartContext.tsx"
  ];

  const missingCritical = critical.filter((p) => !exists(p));
  if (missingCritical.length) {
    fail(`arquivos críticos ausentes:\n- ${missingCritical.join("\n- ")}`);
  }

  console.log(`[smoke] OK (${requiredFiles.length} rotas + ${critical.length} críticos)`);
}

main();
