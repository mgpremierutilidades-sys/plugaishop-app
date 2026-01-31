#!/usr/bin/env node
/**
 * Relatório simples: quantas decisões, média de score, quantas exigiram CEO.
 */

const fs = require("fs");
const path = require("path");

function safeReadLines(p) {
  try {
    const txt = fs.readFileSync(p, "utf8");
    return txt.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const logPath = path.join(process.cwd(), "ai/governance/decisions.log.ndjson");
  const lines = safeReadLines(logPath);

  let total = 0;
  let sumScore = 0;
  let ceo = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      total++;
      if (typeof obj.score === "number") sumScore += obj.score;
      if (obj.precisaCEO === true) ceo++;
    } catch {
      // ignore malformed lines
    }
  }

  const avg = total ? (sumScore / total).toFixed(2) : "0.00";

  const report = {
    timestamp: new Date().toISOString(),
    totalDecisions: total,
    averageScore: Number(avg),
    decisionsRequiringCEO: ceo
  };

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

main();
