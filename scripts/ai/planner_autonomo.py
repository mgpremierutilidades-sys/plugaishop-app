import json
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path.cwd()
INDEX = ROOT / "INDEX_AI.json"
COMMANDS_DIR = ROOT / "handoff" / "commands"
PROCESSED_DIR = ROOT / "handoff" / "processed"
RULES = ROOT / "scripts" / "ai" / "autonomy.rules.json"

COMMANDS_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

def load_json(path: Path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8", errors="ignore"))

def write_command(payload: dict):
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    cid = f"{ts}_{uuid.uuid4().hex[:8]}"
    path = COMMANDS_DIR / f"{cid}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[PLANNER] Command created: {path.name}")

def fingerprint(obj: dict) -> str:
    core = {
        "type": obj.get("type"),
        "module": obj.get("module"),
        "intent": obj.get("intent"),
        "ops": obj.get("ops", None),
    }
    raw = json.dumps(core, sort_keys=True, ensure_ascii=False)
    return str(abs(hash(raw)))

def already_done(fp: str) -> bool:
    for p in PROCESSED_DIR.glob("*.json"):
        try:
            obj = json.loads(p.read_text(encoding="utf-8", errors="ignore"))
            if obj.get("_fingerprint") == fp:
                return True
        except Exception:
            continue
    return False

def plan_cart_batch():
    # Nível 3: infra first (sem UI)
    return [
        {
            "type": "development_task",
            "module": "cart",
            "intent": "Fix carrinho: garantir +/− funcional e estado consistente (sem alterar layout).",
            "constraints": ["layout intocado", "Aba Carrinho visual intocável", "sem integrações externas"],
            "priority": "high",
            "origin": "planner_autonomo_L3",
            "benchmark_basis": ["Amazon", "Shopify", "Mercado Livre"]
        },
        {
            "type": "ops_task",
            "module": "cart",
            "intent": "Criar domínio puro para matemática de qty/totais (sem mexer UI).",
            "ops": [
                {
                    "op": "write_file",
                    "path": "src/cart/domain/cartMath.ts",
                    "content": (
                        "export function clampQty(qty: number, min = 1, max = 99) {\n"
                        "  if (!Number.isFinite(qty)) return min;\n"
                        "  return Math.max(min, Math.min(max, Math.trunc(qty)));\n"
                        "}\n\n"
                        "export function calcLineTotal(unitPrice: number, qty: number) {\n"
                        "  const q = clampQty(qty);\n"
                        "  const p = Number.isFinite(unitPrice) ? unitPrice : 0;\n"
                        "  return p * q;\n"
                        "}\n"
                    )
                }
            ],
            "constraints": ["layout intocado"],
            "priority": "high",
            "origin": "planner_autonomo_L3",
            "benchmark_basis": ["Shopify"]
        }
    ]

def plan_explore_batch():
    return [
        {
            "type": "development_task",
            "module": "explore",
            "intent": "Infra explorar: discovery/ranking base sem alterar estrutura visual (perf e robustez).",
            "constraints": ["estrutura visual mantida", "sem UI nova"],
            "priority": "high",
            "origin": "planner_autonomo_L3",
            "benchmark_basis": ["Amazon"]
        },
        {
            "type": "ops_task",
            "module": "explore",
            "intent": "Criar util de scoring para ranking futuro (sem mexer UI).",
            "ops": [
                {
                    "op": "write_file",
                    "path": "src/explore/domain/score.ts",
                    "content": (
                        "export type ScoreInput = {\n"
                        "  popularity?: number;\n"
                        "  recencyDays?: number;\n"
                        "  price?: number;\n"
                        "};\n\n"
                        "export function computeScore(i: ScoreInput): number {\n"
                        "  const pop = Number.isFinite(i.popularity) ? (i.popularity as number) : 0;\n"
                        "  const rec = Number.isFinite(i.recencyDays) ? (i.recencyDays as number) : 999;\n"
                        "  const pr = Number.isFinite(i.price) ? (i.price as number) : 0;\n"
                        "  const recencyBoost = 1 / (1 + Math.max(0, rec));\n"
                        "  const pricePenalty = pr > 0 ? 1 / (1 + pr / 100) : 1;\n"
                        "  return pop * 0.7 + recencyBoost * 0.2 + pricePenalty * 0.1;\n"
                        "}\n"
                    )
                }
            ],
            "constraints": ["layout intocado"],
            "priority": "high",
            "origin": "planner_autonomo_L3",
            "benchmark_basis": ["Amazon"]
        }
    ]

def main_loop():
    print("[PLANNER] Autonomous planner started (L3)")

    index = load_json(INDEX)
    if not index:
        print("[PLANNER] INDEX_AI.json vazio ou inexistente (rode index-generator.mjs).")
        return

    _rules = load_json(RULES).get("rules", {})

    while True:
        batch = []
        batch.extend(plan_cart_batch())
        batch.extend(plan_explore_batch())

        created = 0
        for t in batch:
            fp = fingerprint(t)
            t["_fingerprint"] = fp
            if already_done(fp):
                continue
            write_command(t)
            created += 1

        if created == 0:
            time.sleep(60)
        else:
            time.sleep(15)

if __name__ == "__main__":
    main_loop()
