import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

analysis = {
    "tabs": [],
    "checkout": [],
    "orders": [],
    "issues": []
}

tabs_dir = ROOT / "app" / "(tabs)"
if not tabs_dir.exists():
    analysis["issues"].append("Missing app/(tabs) directory")
else:
    for p in tabs_dir.glob("*.tsx"):
        analysis["tabs"].append(p.name)

checkout_dir = tabs_dir / "checkout"
if checkout_dir.exists():
    for p in checkout_dir.glob("*.tsx"):
        analysis["checkout"].append(p.name)
else:
    analysis["issues"].append("Missing app/(tabs)/checkout directory")

orders_dir = ROOT / "app" / "orders"
if orders_dir.exists():
    for p in orders_dir.rglob("*.tsx"):
        analysis["orders"].append(str(p.relative_to(ROOT)))

out = ROOT / "scripts" / "ai" / "_out" / "analysis.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(analysis, indent=2), encoding="utf-8")

print("Analysis generated:", out)
