import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"

def is_route_file(p: Path) -> bool:
    if not p.is_file():
        return False
    if p.suffix not in (".ts", ".tsx"):
        return False
    return True

def normalize_url(rel: str) -> str:
    # Expo Router: grupos (xxx) não entram na URL
    rel = rel.replace("\\", "/")
    parts = [p for p in rel.split("/") if p and not (p.startswith("(") and p.endswith(")"))]

    # remove "app/" prefix
    if parts and parts[0] == "app":
        parts = parts[1:]

    # _layout.tsx não é rota, mas guardamos como "layout"
    # index.tsx vira "/"
    if parts and parts[-1].startswith("_layout."):
        parts[-1] = "__layout__"

    # remove extensão
    parts[-1] = parts[-1].rsplit(".", 1)[0]

    # index => remove segmento final
    if parts and parts[-1] == "index":
        parts = parts[:-1]

    url = "/" + "/".join(parts)
    url = url.replace("/__layout__", "/__layout__")
    return url if url != "" else "/"

routes = []
layouts = []

for p in APP.rglob("*"):
    if not is_route_file(p):
        continue
    rel = str(p.relative_to(ROOT))
    url = normalize_url(rel)

    entry = {"file": rel.replace("\\", "/"), "url": url}
    if url.endswith("/__layout__") or url == "/__layout__":
        layouts.append(entry)
    else:
        routes.append(entry)

# Detect duplicates by URL
by_url = {}
for r in routes:
    by_url.setdefault(r["url"], []).append(r["file"])

duplicates = {u: files for u, files in by_url.items() if len(files) > 1}

report = {
    "routes_count": len(routes),
    "layouts_count": len(layouts),
    "duplicates": duplicates,
    "sample_routes": sorted(routes, key=lambda x: x["url"])[:40],
}

out = ROOT / "scripts" / "ai" / "_out" / "routes-report.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2), encoding="utf-8")
print("Routes report:", out)
