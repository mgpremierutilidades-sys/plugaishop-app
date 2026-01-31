import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # .../scripts/ai/agent_loop.py -> repo root
HANDOFF = ROOT / "handoff"
CMDS_DIR = HANDOFF / "commands"
OUT_DIR = HANDOFF / "out"

DEFAULT_CONFIG = {
    "mode": "observe",  # observe | suggest (suggest só prepara relatórios; não altera código)
    "run_lint": True,
    "run_tests": False,     # jest watchAll pode travar; por padrão desliga
    "run_typecheck": True,  # tsc --noEmit
    "run_support_bundle": True,  # npm run support:bundle (se existir)
    "run_context_zip": False,    # npm run context (se você quiser snapshots mais completos)
    "command_poll_seconds": 10,
}

def run(cmd, timeout=900):
    """Run shell command and capture output."""
    p = subprocess.run(
        cmd,
        cwd=str(ROOT),
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=timeout,
    )
    return p.returncode, p.stdout

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def ensure_dirs():
    CMDS_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

def load_config():
    cfg_path = ROOT / "scripts" / "ai" / "agent_config.json"
    if cfg_path.exists():
        try:
            return {**DEFAULT_CONFIG, **json.loads(cfg_path.read_text(encoding="utf-8"))}
        except Exception:
            return DEFAULT_CONFIG.copy()
    return DEFAULT_CONFIG.copy()

def write_report(lines, report_name="REPORT.md"):
    report_path = OUT_DIR / report_name
    report_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return report_path

def list_pending_commands():
    # comandos simples: *.txt
    return sorted(CMDS_DIR.glob("*.txt"), key=lambda p: p.stat().st_mtime)

def consume_command(cmd_path: Path):
    content = cmd_path.read_text(encoding="utf-8", errors="replace").strip()
    cmd_path.rename(cmd_path.with_suffix(".done"))
    return content

def git_status_short():
    rc, out = run("git status --porcelain")
    if rc != 0:
        return "git status falhou"
    return out.strip() or "(clean)"

def summarize_output(label, rc, out, max_lines=80):
    lines = out.splitlines()
    clipped = lines[-max_lines:] if len(lines) > max_lines else lines
    return [
        f"### {label}",
        f"- exit_code: {rc}",
        "```",
        *clipped,
        "```",
        "",
    ]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="Roda uma vez e sai (recomendado para iniciar)")
    ap.add_argument("--loop", action="store_true", help="Fica em loop lendo comandos")
    args = ap.parse_args()

    ensure_dirs()
    cfg = load_config()

    def execute_cycle(trigger="manual"):
        lines = []
        lines.append(f"# Plugaishop AI Agent Report")
        lines.append(f"- time: {now()}")
        lines.append(f"- trigger: {trigger}")
        lines.append(f"- mode: {cfg.get('mode')}")
        lines.append("")
        lines.append("## Git")
        lines.append("```")
        lines.append(git_status_short())
        lines.append("```")
        lines.append("")

        # Lint
        if cfg.get("run_lint"):
            rc, out = run("npm run lint", timeout=1200)
            lines += summarize_output("npm run lint", rc, out)

        # Typecheck
        if cfg.get("run_typecheck"):
            rc, out = run("npx tsc -p tsconfig.json --noEmit", timeout=1200)
            lines += summarize_output("tsc --noEmit", rc, out)

        # Tests (opcional)
        if cfg.get("run_tests"):
            rc, out = run("npm test -- --runInBand", timeout=1800)
            lines += summarize_output("jest", rc, out)

        # Support bundle
        if cfg.get("run_support_bundle"):
            # só tenta se existir script no package.json; fallback silencioso
            rc, out = run("npm run support:bundle", timeout=1800)
            lines += summarize_output("support:bundle", rc, out)

        # Context ZIP (o seu script existente)
        if cfg.get("run_context_zip"):
            rc, out = run("npm run context", timeout=1800)
            lines += summarize_output("npm run context", rc, out)

        # Próximas ações sugeridas (não altera código)
        lines.append("## Sugestões automáticas (safe)")
        lines.append("- Se lint/typecheck falhou: corrigir primeiro (sem mexer em UI).")
        lines.append("- Se bundle/context gerou ZIP: envie o ZIP ao ChatGPT para análise e patches.")
        lines.append("- Se (clean) e tudo ok: pedir próxima tarefa (Aba/Backlog).")
        lines.append("")

        report_path = write_report(lines)
        print(f"[OK] Report gerado em: {report_path}")

    if args.once:
        execute_cycle("once")
        return

    if args.loop:
        poll = int(cfg.get("command_poll_seconds", 10))
        print(f"[LOOP] Lendo comandos em {CMDS_DIR} a cada {poll}s (CTRL+C para sair)")
        while True:
            cmds = list_pending_commands()
            if cmds:
                cmd_path = cmds[0]
                cmd = consume_command(cmd_path)
                execute_cycle(f"command:{cmd[:40]}")
            time.sleep(poll)
        return

    print("Use --once ou --loop")
    sys.exit(1)

if __name__ == "__main__":
    main()
