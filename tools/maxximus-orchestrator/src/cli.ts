import fs from "node:fs";
import path from "node:path";
import { log } from "./core/logger.js";
import { getPaths } from "./core/paths.js";

const API = process.env.MAXXIMUS_API || "http://127.0.0.1:8080";

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd) return usage();

  switch (cmd) {
    case "status": {
      const j = await apiGet("/status");
      log(JSON.stringify(j, null, 2));
      return;
    }

    case "goal": {
      const text = rest.join(" ").trim();
      if (!text) return usage();
      const j = await apiPost("/goal", { text });
      log(JSON.stringify(j, null, 2));
      return;
    }

    case "pause": {
      const hours = Number(rest[0] || "1");
      const j = await apiPost("/pause", { hours });
      log(JSON.stringify(j, null, 2));
      return;
    }

    case "assign": {
      const j = await apiPost("/tasks/assign-next", {});
      log(JSON.stringify(j, null, 2));
      return;
    }

    case "done": {
      const id = rest[0];
      if (!id) return usage();
      const note = rest.slice(1).join(" ");
      const j = await apiPost(`/tasks/${id}/done`, { note });
      log(JSON.stringify(j, null, 2));
      return;
    }

    case "fail": {
      const id = rest[0];
      if (!id) return usage();
      const note = rest.slice(1).join(" ");
      const j = await apiPost(`/tasks/${id}/failed`, { note });
      log(JSON.stringify(j, null, 2));
      return;
    }

    case "report": {
      const status = await apiGet("/status");
      const { reportsDir } = getPaths();

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = path.join(reportsDir, `report-${stamp}.json`);

      const payload = {
        generatedAt: new Date().toISOString(),
        api: API,
        summary: summarize(status),
        snapshot: status
      };

      fs.writeFileSync(file, JSON.stringify(payload, null, 2));
      log(`report_saved: ${file}`);
      log(JSON.stringify(payload.summary, null, 2));
      return;
    }

    default:
      return usage();
  }
}

function summarize(status: any) {
  const tasks = Array.isArray(status?.tasks) ? status.tasks : [];
  const goals = Array.isArray(status?.state?.goals) ? status.state.goals : [];
  const metrics = status?.metrics || {};

  const tasksByStatus = tasks.reduce((acc: Record<string, number>, t: any) => {
    const s = String(t?.status || "unknown");
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return {
    goals_count: goals.length,
    tasks_total: tasks.length,
    tasks_by_status: tasksByStatus,
    metrics
  };
}

async function apiGet(p: string) {
  const r = await fetch(`${API}${p}`);
  if (!r.ok) throw new Error(`GET ${p} -> ${r.status}`);
  return r.json();
}

async function apiPost(p: string, body: any) {
  const r = await fetch(`${API}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  if (!r.ok) throw new Error(`POST ${p} -> ${r.status}`);
  return r.json();
}

function usage() {
  console.log([
    "",
    "maxximus (Etapa 2)",
    "",
    "Comandos:",
    "  status",
    "  goal \"<texto>\"",
    "  pause <hours>",
    "  assign",
    "  done <taskId> \"<note>\"",
    "  fail <taskId> \"<note>\"",
    "  report",
    "",
    "Ex:",
    "  npm run cli status",
    "  npm run cli goal \"melhorar conversão\"",
    "  npm run cli assign",
    "  npm run cli report",
    ""
  ].join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});