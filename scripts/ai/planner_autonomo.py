import json
import time
import uuid
from pathlib import Path
from datetime import datetime

ROOT = Path.cwd()
INDEX = ROOT / "INDEX_AI.json"
COMMANDS_DIR = ROOT / "handoff" / "commands"
RULES = ROOT / "scripts" / "ai" / "autonomy.rules.json"

COMMANDS_DIR.mkdir(parents=True, exist_ok=True)

def load_json(path: Path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

def write_command(payload: dict):
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    cid = f"{ts}_{uuid.uuid4().hex[:8]}"
    path = COMMANDS_DIR / f"{cid}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"[PLANNER] Command created: {path.name}")

def plan_cart_module():
    return [
        {
            "target": "cart",
            "goal": "Evoluir Aba Carrinho com persistência, estados resilientes e performance (Amazon + Shopify)",
            "constraints": ["layout intocado", "sem integrações externas"]
        }
    ]

def plan_explore_module():
    return [
        {
            "target": "explore",
            "goal": "Evoluir Aba Explorar com descoberta eficiente e scroll performático (Amazon)",
            "constraints": ["estrutura visual mantida"]
        }
    ]

def main_loop():
    print("[PLANNER] Autonomous planner started")

    index = load_json(INDEX)
    if not index:
        print("[PLANNER] INDEX_AI.json vazio ou inexistente")
        return

    planned = set()

    while True:
        tasks = []

        if "cart" not in planned:
            tasks.extend(plan_cart_module())
            planned.add("cart")

        if "explore" not in planned:
            tasks.extend(plan_explore_module())
            planned.add("explore")

        for task in tasks:
            write_command({
                "type": "development_task",
                "module": task["target"],
                "intent": task["goal"],
                "constraints": task["constraints"],
                "priority": "high",
                "origin": "planner_autonomo",
                "benchmark_basis": ["Amazon", "Shopify", "Mercado Livre"]
            })

        time.sleep(60)

if __name__ == "__main__":
    main_loop()
