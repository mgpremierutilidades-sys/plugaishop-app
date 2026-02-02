# scripts/ai/executor_level2.py
import json
import time
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
COMMANDS = ROOT / "handoff" / "commands"
PROCESSED = ROOT / "handoff" / "processed"
LOGS = ROOT / "handoff" / "logs"
PROMPT_ZERO = ROOT / "scripts" / "ai" / "PROMPT_ZERO.md"

LOGS.mkdir(parents=True, exist_ok=True)
PROCESSED.mkdir(parents=True, exist_ok=True)

def log(msg):
    ts = datetime.now().isoformat()
    with open(LOGS / "executor.log", "a", encoding="utf-8") as f:
        f.write(f"{ts} {msg}\n")
    print(msg)

def hard_stop(reason, payload):
    log(f"[HARD STOP] {reason}")
    log(json.dumps(payload, indent=2, ensure_ascii=False))
    raise SystemExit(1)

def validate_prompt_zero():
    if not PROMPT_ZERO.exists():
        hard_stop("PROMPT_ZERO ausente", {})

def validate_file_exists(path: str):
    p = ROOT / path
    if not p.exists():
        hard_stop("Arquivo referenciado não existe", {"path": path})
    return p

def handle_development_task(cmd):
    target = cmd.get("module") or cmd.get("target")
    intent = cmd.get("intent", "")

    # REGRA ABSOLUTA
    if "layout" in intent.lower() or "visual" in intent.lower():
        hard_stop("Tentativa de alterar layout", cmd)

    todo_path = ROOT / target / "AUTONOMOUS_TODO.md"
    todo_path.parent.mkdir(parents=True, exist_ok=True)

    with open(todo_path, "a", encoding="utf-8") as f:
        f.write(f"\n- {intent}")

    log(f"[OK] TODO atualizado: {todo_path}")

def loop():
    log("[EXECUTOR L2] Iniciado (Prompt Zero ativo)")
    validate_prompt_zero()

    while True:
        for file in COMMANDS.glob("*.json"):
            cmd = json.loads(file.read_text(encoding="utf-8"))

            if cmd.get("type") == "development_task":
                handle_development_task(cmd)
            else:
                hard_stop("Tipo de comando desconhecido", cmd)

            file.rename(PROCESSED / file.name)
            log(f"[EXECUTOR] Processado {file.name}")

        time.sleep(10)

if __name__ == "__main__":
    loop()
