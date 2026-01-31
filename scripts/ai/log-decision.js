#!/usr/bin/env node
/**
 * Append-only log (NDJSON) de decisões.
 *
 * Ex:
 * node scripts/ai/log-decision.js --json '{"ia":"frontend_ai","decision":"...","score":92,"precisaCEO":false,"timestamp":"..."}'
 *
 * Ou combine com consult-guidelines:
 * node scripts/ai/consult-guidelines.js --ia "frontend_ai" --decision "..." --impact "perf" | node scripts/ai/log-decision.js
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

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.resume();
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const logPath = path.join(process.cwd(), "ai/governance/decisions.log.ndjson");

  let payloadRaw = "";
  if (args.json) payloadRaw = args.json;
  else payloadRaw = await readStdin();

  if (!payloadRaw) {
    console.error("No input. Provide --json '{...}' or pipe JSON to stdin.");
    process.exit(1);
  }

  let obj;
  try {
    obj = JSON.parse(payloadRaw);
  } catch (e) {
    console.error("Invalid JSON input.");
    process.exit(1);
  }

  // minimal normalization
  if (!obj.timestamp) obj.timestamp = new Date().toISOString();

  const line = JSON.stringify(obj);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, line + "\n", "utf8");

  process.stdout.write(`OK logged → ${path.relative(process.cwd(), logPath)}\n`);
}

main();
