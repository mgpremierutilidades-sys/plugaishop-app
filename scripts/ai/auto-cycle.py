import json
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path

def run(cmd: str, cwd: str, timeout: int = 60 * 20):
    p = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, timeout=timeout)
    out = (p.stdout or "") + ("\n" + p.stderr if p.stderr else "")
    return p.returncode, out.strip()

def write_file(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def now_iso():
    return datetime.now().isoformat(timespec="seconds")

def git_has_changes(project_root: str) -> bool:
    code, out = run("git status --porcelain", project_root)
    return code == 0 and len(out.strip()) > 0

def commit_all(project_root: str, message: str):
    run("git add -A", project_root)
    run(f'git commit -m "{message}"', project_root)

def ensure_branch(project_root: str, branch: str):
    run(f"git checkout {branch}", project_root)

def make_report(project_root: str, context_bundle: str, cycle_log: str, next_ok: datetime) -> str:
    return (
        "# Plugaishop Autonomous Report\n\n"
        f"- Timestamp: {now_iso()}\n"
        f"- Project: {project_root}\n"
        f"- Context bundle: {context_bundle}\n"
        f"- Next human OK: {next_ok.isoformat(timespec='seconds')}\n\n"
        "## Cycle log\n"
        "```txt\n"
        f"{cycle_log[:12000]}\n"
        "```\n"
    )

def main():
    root = Path("E:/plugaishop-app")
    cfg_path = root / "scripts" / "ai" / "config.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))

    project_root = cfg["projectRoot"]
    branch = cfg["branch"]
    checkpoint_hours = int(cfg["checkpointHours"])
    cycle_minutes = int(cfg["cycleMinutes"])

    context_bundle = str(root / cfg["files"]["contextBundle"])
    report_path = root / cfg["files"]["report"]
    state_path = root / cfg["files"]["state"]

    last_ok = datetime.now()
    next_ok = last_ok + timedelta(hours=checkpoint_hours)

    state = {
        "startedAt": now_iso(),
        "lastHumanOk": last_ok.isoformat(timespec="seconds"),
        "nextHumanOk": next_ok.isoformat(timespec="seconds"),
        "cycles": 0
    }
    write_file(state_path, json.dumps(state, indent=2))

    ensure_branch(project_root, branch)

    while True:
        state["cycles"] += 1
        cycle_log = [f"[{now_iso()}] cycle={state['cycles']} start"]

        code, out = run(
            f'powershell -ExecutionPolicy Bypass -File .\\scripts\\ai\\export-context.ps1 -ProjectRoot "{project_root}" -OutFile "{context_bundle}"',
            project_root
        )
        cycle_log.append("export-context: " + ("OK" if code == 0 else f"FAIL({code})"))
        if out:
            cycle_log.append(out[:4000])

        code, out = run(cfg["commands"]["lint"], project_root)
        cycle_log.append("lint: " + ("OK" if code == 0 else f"FAIL({code})"))
        if out:
            cycle_log.append(out[:4000])

        code, out = run(
            f'powershell -ExecutionPolicy Bypass -File .\\scripts\\ai\\fix-all.ps1 -ProjectRoot "{project_root}"',
            project_root
        )
        cycle_log.append("fix-all: " + ("OK" if code == 0 else f"FAIL({code})"))
        if out:
            cycle_log.append(out[:4000])

        if git_has_changes(project_root):
            msg = f"chore(auto): cycle {state['cycles']} fixes"
            commit_all(project_root, msg)
            cycle_log.append("git commit: " + msg)
        else:
            cycle_log.append("git commit: no changes")

        report = make_report(project_root, context_bundle, "\n".join(cycle_log), next_ok)
        write_file(report_path, report)

        write_file(state_path, json.dumps({
            **state,
            "lastHumanOk": last_ok.isoformat(timespec="seconds"),
            "nextHumanOk": next_ok.isoformat(timespec="seconds"),
            "updatedAt": now_iso()
        }, indent=2))

        if datetime.now() >= next_ok:
            print("\n" + "="*70)
            print("🧑‍💻 CHECKPOINT HUMANO (7h): está tudo OK para continuar? [S/N]")
            print(f"📄 Relatório: {report_path}")
            print("="*70 + "\n")
            ans = input("OK para continuar? ").strip().lower()
            if ans.startswith("s"):
                last_ok = datetime.now()
                next_ok = last_ok + timedelta(hours=checkpoint_hours)
            else:
                print("⛔ Pausado por decisão humana.")
                break

        time.sleep(cycle_minutes * 60)

if __name__ == "__main__":
    main()
