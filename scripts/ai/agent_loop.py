import json
import time
import shutil
import subprocess
import hashlib
from pathlib import Path
from datetime import datetime

ROOT = Path.cwd()
COMMANDS_DIR = ROOT / "handoff" / "commands"
PROCESSED_DIR = ROOT / "handoff" / "processed"
LOG_DIR = ROOT / "handoff" / "logs"

APPROVAL_REQ_DIR = ROOT / "handoff" / "approvals" / "requests"
APPROVAL_INBOX_DIR = ROOT / "approvals" / "inbox"
BUNDLE_REQ_DIR = ROOT / "handoff" / "bundle_requests"

RULES_PATH = ROOT / "scripts" / "ai" / "autonomy.rules.json"
CFG_JSON = ROOT / "scripts" / "ai" / "autonomy.config.json"
CFG_TYPO = ROOT / "scripts" / "ai" / "autonomy.config.jso"
PROMPT_ZERO = ROOT / "scripts" / "ai" / "PROMPT_ZERO.md"

for p in [COMMANDS_DIR, PROCESSED_DIR, LOG_DIR, APPROVAL_REQ_DIR, APPROVAL_INBOX_DIR, BUNDLE_REQ_DIR]:
    p.mkdir(parents=True, exist_ok=True)

def _now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log(msg: str):
    line = f"{_now()} {msg}"
    print(f"[EXEC] {msg}")
    # APPEND (não sobrescreve mais)
    with open(LOG_DIR / "executor.log", "a", encoding="utf-8", errors="ignore") as f:
        f.write(line + "\n")

def load_json(path: Path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception as e:
        log(f"Failed to parse JSON {path}: {e}")
        return {}

def load_rules():
    return load_json(RULES_PATH).get("rules", {})

def load_cfg():
    # corrige typo
    if (not CFG_JSON.exists()) and CFG_TYPO.exists():
        CFG_TYPO.rename(CFG_JSON)
        log("Renamed autonomy.config.jso -> autonomy.config.json")

    cfg = load_json(CFG_JSON)
    if cfg:
        return cfg

    # fallback seguro (Prompt Zero)
    return {
        "mode": "safe",
        "guardrails": {
            "layout_frozen": True,
            "ui_write_allowed": False,
            "never_touch_paths": ["_share/", "_tmp/", "backups/", "_bundle_out/"],
            "ui_allowlist_paths": ["utils/", "constants/", "scripts/", "handoff/", "context/", "src/"],
        },
        "approval": {
            "enabled": True,
            "inbox_path": "approvals/inbox",
            "required_for_paths": ["app/", "components/", "app/(tabs)/cart.tsx", "app/(tabs)/index.tsx"],
        }
    }

def assert_prompt_zero():
    if not PROMPT_ZERO.exists():
        raise RuntimeError("PROMPT_ZERO.md ausente. Prompt Zero é prioridade #0. Abortando.")

def path_is_forbidden(rel: str, cfg: dict, rules: dict) -> bool:
    rel_norm = rel.replace("\\", "/")

    never_touch = cfg.get("guardrails", {}).get("never_touch_paths", [])
    never_touch += [p.rstrip("/") + "/" for p in rules.get("never_touch", [])]

    for nt in never_touch:
        if rel_norm.startswith(nt):
            return True

    layout_frozen = cfg.get("guardrails", {}).get("layout_frozen", True)
    if not layout_frozen:
        return False

    ui_write_allowed = cfg.get("guardrails", {}).get("ui_write_allowed", False)
    if ui_write_allowed:
        return False

    allow = cfg.get("guardrails", {}).get("ui_allowlist_paths", [])
    return not any(rel_norm.startswith(a) for a in allow)

def approval_required(rel: str, cfg: dict) -> bool:
    rel_norm = rel.replace("\\", "/")
    approval = cfg.get("approval", {})
    if not approval.get("enabled", True):
        return False
    required = approval.get("required_for_paths", [])
    return any(rel_norm == r or rel_norm.startswith(r.rstrip("/") + "/") for r in required)

def approval_token_exists(command_id: str) -> bool:
    token = APPROVAL_INBOX_DIR / f"{command_id}.approved.json"
    return token.exists()

def request_approval(command_id: str, reason: str, touched_paths: list[str], cmd: dict):
    req = {
        "type": "approval_request",
        "command_id": command_id,
        "reason": reason,
        "touched_paths": touched_paths,
        "created_at": datetime.now().isoformat(),
        "command_preview": {
            "type": cmd.get("type"),
            "module": cmd.get("module"),
            "intent": cmd.get("intent"),
            "ops_count": len(cmd.get("ops", [])) if isinstance(cmd.get("ops"), list) else 0
        }
    }
    out = APPROVAL_REQ_DIR / f"{command_id}.approval_request.json"
    out.write_text(json.dumps(req, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Approval requested: {out.name}")

def request_bundle(needed_files: list[str], reason: str, command_id: str):
    payload = {
        "needed_files": needed_files,
        "reason": f"{reason}_{command_id}",
        "created_at": datetime.now().isoformat()
    }
    out = BUNDLE_REQ_DIR / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{command_id}.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Bundle request created: {out.name} (files={len(needed_files)})")

def load_command(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="ignore"))
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
    content = path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""
    entry = f"\n## {datetime.now().isoformat()}\n- {intent}\n"

    path.write_text(content + entry, encoding="utf-8")
    log(f"Updated TODO for module '{module}'")

def handle_development_task(cmd: dict):
    module = cmd.get("module")
    intent = cmd.get("intent")

    if not module or not intent:
        log("Invalid development_task command (missing module or intent)")
        return True

    log(f"Handling development_task for module '{module}'")
    mark_todo(module, intent)
    return True

def op_write_file(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    log(f"op_write_file OK: {rel_path}")

def op_replace_in_file(rel_path: str, find_text: str, replace_text: str):
    p = ROOT / rel_path
    txt = p.read_text(encoding="utf-8", errors="ignore")
    if find_text not in txt:
        log(f"op_replace_in_file: find_text not found in {rel_path}")
        return False
    p.write_text(txt.replace(find_text, replace_text), encoding="utf-8")
    log(f"op_replace_in_file OK: {rel_path}")
    return True

def handle_ops_task(cmd: dict, cfg: dict, rules: dict, command_id: str):
    ops = cmd.get("ops", [])
    if not isinstance(ops, list) or not ops:
        log("ops_task invalid (missing ops list)")
        return False

    touched = []
    needed = []

    for op in ops:
        if not isinstance(op, dict):
            continue
        rel = op.get("path")
        if not rel:
            continue
        rel_norm = rel.replace("\\", "/")
        touched.append(rel_norm)

        must_exist = op.get("must_exist", False)
        if must_exist and not (ROOT / rel_norm).exists():
            needed.append(rel_norm)

    # Prompt Zero: sem escuro -> pede bundle e NÃO aplica
    if needed:
        request_bundle(needed, "missing_files", command_id)
        log("ops_task deferred (missing files). Waiting for bundle.")
        return False

    forbidden = [p for p in touched if path_is_forbidden(p, cfg, rules)]
    if forbidden:
        request_approval(command_id, "guardrails_blocked_path", forbidden, cmd)
        log(f"ops_task blocked by guardrails: {forbidden}")
        return False

    if any(approval_required(p, cfg) for p in touched):
        if not approval_token_exists(command_id):
            request_approval(command_id, "approval_required_for_ui_paths", touched, cmd)
            log("ops_task awaiting approval token in approvals/inbox")
            return False

    ok_all = True
    for op in ops:
        kind = op.get("op")
        rel = op.get("path", "").replace("\\", "/")

        if kind == "write_file":
            op_write_file(rel, op.get("content", ""))
        elif kind == "replace_in_file":
            ok = op_replace_in_file(rel, op.get("find", ""), op.get("replace", ""))
            ok_all = ok_all and ok
        else:
            log(f"Unknown op kind: {kind}")
            ok_all = False

    return ok_all

def git_commit(msg: str):
    subprocess.run(["git", "add", "."], check=False)
    subprocess.run(["git", "commit", "-m", msg], check=False)
    log("Git commit executed")

def process_command(path: Path, cfg: dict, rules: dict):
    cmd = load_command(path)
    if not cmd:
        return

    cmd_type = cmd.get("type")
    command_id = path.stem

    processed = False

    if cmd_type == "development_task":
        processed = handle_development_task(cmd)

    elif cmd_type == "ops_task":
        processed = handle_ops_task(cmd, cfg, rules, command_id)

    else:
        log(f"Unknown command type '{cmd_type}' in {path.name}")
        return

    # Se foi bloqueado/deferido, não move para processed e não commita
    if not processed:
        return

    dest = PROCESSED_DIR / path.name
    shutil.move(str(path), str(dest))
    log(f"Command {path.name} processed")

    git_commit(f"chore: autonomous task ({cmd_type})")

def loop():
    assert_prompt_zero()
    cfg = load_cfg()
    rules = load_rules()

    log("Executor loop started (L3)")
    while True:
        for cmd_file in COMMANDS_DIR.glob("*.json"):
            process_command(cmd_file, cfg, rules)
        time.sleep(10)

if __name__ == "__main__":
    loop()
