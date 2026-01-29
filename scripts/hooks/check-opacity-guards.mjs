import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p, "utf8"); }

function walk(dir){
  const out = [];
  if (!exists(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function isCodeFile(p){
  return p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".js") || p.endsWith(".jsx");
}

function fail(msg){
  console.error(`\n[Opacity Guardrails] FAIL: ${msg}\n`);
  process.exit(1);
}

const targets = [
  path.join(root, "app"),
  path.join(root, "components"),
  path.join(root, "providers"),
  path.join(root, "context"),
  path.join(root, "hooks"),
  path.join(root, "src"),
];

const files = targets.flatMap(walk).filter(isCodeFile);

const offenders = [];

for (const f of files){
  const rel = path.relative(root, f);
  const txt = read(f);

  const hasModal = txt.includes("<Modal") || txt.includes("Modal ");
  if (!hasModal) continue;

  const hasTransparent = /<Modal[^>]*\btransparent\b/.test(txt) || /transparent\s*=\s*{?\s*true\s*}?/.test(txt);
  if (!hasTransparent) continue;

  const hasOnDismiss = /\bonDismiss\s*=/.test(txt);
  const hasOnRequestClose = /\bonRequestClose\s*=/.test(txt);

  if (!hasOnDismiss || !hasOnRequestClose){
    offenders.push({
      rel,
      reason: `Modal transparent sem ${!hasOnDismiss ? "onDismiss" : ""}${(!hasOnDismiss && !hasOnRequestClose) ? " e " : ""}${!hasOnRequestClose ? "onRequestClose" : ""}`,
    });
  }

  const hasFocusTools =
    txt.includes("useIsFocused") ||
    txt.includes("useFocusEffect") ||
    /isFocused\s*&&\s*<Modal/.test(txt) ||
    /<Modal[^>]*visible\s*=\s*{[^}]*isFocused/.test(txt);

  if (!hasFocusTools){
    offenders.push({ rel, reason: "Modal transparent sem gating/cleanup por foco (useIsFocused/useFocusEffect/condicional)" });
  }
}

if (offenders.length){
  const lines = offenders.map(o => `- ${o.rel}: ${o.reason}`).join("\n");
  fail(`Padrões perigosos detectados (podem causar dimming global):\n${lines}\nCorrija antes de commitar/push.`);
}

console.log("[Opacity Guardrails] OK");
