import json
import time
import shutil
from pathlib import Path
from datetime import datetime

ROOT = Path.cwd()
COMMANDS_DIR = ROOT / "handoff" / "commands"
PROCESSED_DIR = ROOT / "handoff" / "processed"
LOG_DIR = ROOT / "handoff" / "logs"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[EXEC] {msg}")
    (LOG_DIR / "executor.log").write_text(
        f"{ts} {msg}\n",
        encoding="utf-8",
        errors="ignore"
    )

def load_command(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        log(f"Failed to read command {path.name}: {e}")
        return None

def mark_todo(module: str, intent: str):
    """
    Execução segura nível 1:
    cria/atualiza arquivos de intenção sem quebrar código existente
    """
    target_map = {
        "cart": ROOT / "src" / "cart" / "AUTONOMOUS_TODO.md",
        "explore": ROOT / "app" / "explore" / "AUTONOMOUS_TODO.md",
    }

    path = target_map.get(module)
    if not path:
        log(f"No target mapping for module '{module}'")
        return

    path.parent.mkdir(parents=True, exist_ok=True)

    content = ""
    if path.exists():
        content = path.read_text(encoding="utf-8")

    entry = f"\n## {datetime.now().isoformat()}\n- {intent}\n"

    path.write_text(content + entry, encoding="utf-8")
    log(f"Updated TODO for module '{module}'")

def handle_development_task(cmd: dict):
    module = cmd.get("module")
    intent = cmd.get("intent")

    if not module or not intent:
        log("Invalid development_task command (missing module or intent)")
        return

    log(f"Handling development_task for module '{module}'")
    mark_todo(module, intent)

def process_command(path: Path):
    cmd = load_command(path)
    if not cmd:
        return

    cmd_type = cmd.get("type")

    if cmd_type == "development_task":
        handle_development_task(cmd)
    else:
        log(f"Unknown command type '{cmd_type}' in {path.name}")
        return

    # mover comando para processed
    dest = PROCESSED_DIR / path.name
    shutil.move(str(path), str(dest))
    log(f"Command {path.name} processed")

    # commit automático
    try:
        import subprocess
        subprocess.run(["git", "add", "."], check=False)
        subprocess.run(
            ["git", "commit", "-m", f"chore: autonomous task ({cmd_type})"],
            check=False
        )
        log("Git commit executed")
    except Exception as e:
        log(f"Git commit failed: {e}")

def loop():
    log("Executor loop started")
    while True:
        for cmd_file in COMMANDS_DIR.glob("*.json"):
            process_command(cmd_file)
        time.sleep(10)

if __name__ == "__main__":
    loop()
