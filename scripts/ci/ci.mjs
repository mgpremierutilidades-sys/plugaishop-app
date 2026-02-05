#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function sh(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function isoNow() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeReport(report) {
  const outDir = path.join("tools", "maxximus-orchestrator", "data", "reports");
  ensureDir(outDir);
  const file = path.join(outDir, `ci-report_${isoNow()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  return file;
}

function main() {
  const startedAt = new Date().toISOString();
  const report = {
    schema: "plugaishop.ci.report.v1",
    startedAt,
    finishedAt: null,
    ok: false,
    steps: [],
    meta: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      ci: Boolean(process.env.CI),
      github: {
        runId: process.env.GITHUB_RUN_ID ?? null,
        sha: process.env.GITHUB_SHA ?? null,
        ref: process.env.GITHUB_REF ?? null
      }
    }
  };

  const runStep = (name, cmd) => {
    const step = { name, cmd, ok: false, startedAt: new Date().toISOString(), finishedAt: null };
    report.steps.push(step);
    try {
      sh(cmd);
      step.ok = true;
    } catch (e) {
      step.ok = false;
      step.error = { message: e?.message ?? String(e) };
      throw e;
    } finally {
      step.finishedAt = new Date().toISOString();
    }
  };

  try {
    runStep("lint", "npm run lint");
    runStep("typecheck", "npm run typecheck");
    runStep("smoke", "npm run smoke");
    report.ok = true;
  } finally {
    report.finishedAt = new Date().toISOString();
    const reportPath = writeReport(report);
    console.log(`\n[plugaishop-ci] report: ${reportPath}\n`);
    if (!report.ok) process.exitCode = 1;
  }
}

main();
