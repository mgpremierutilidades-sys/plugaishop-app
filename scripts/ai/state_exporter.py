import json
import zipfile
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path.cwd()
STATE_DIR = ROOT / "handoff" / "state"
BUNDLES_DIR = ROOT / "handoff" / "state_bundles"
LOG_DIR = ROOT / "handoff" / "logs"

STATE_DIR.mkdir(parents=True, exist_ok=True)
BUNDLES_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return {"cmd": cmd, "code": r.returncode, "out": r.stdout[-4000:], "err": r.stderr[-4000:]}

def write_json(name, data):
    (STATE_DIR / name).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def snapshot():
    ts = datetime.now().isoformat()
    handoff = ROOT / "handoff"
    data = {
        "ts": ts,
        "cwd": str(ROOT),
        "counts": {
            "commands": len(list((handoff / "commands").glob("*.json"))) if (handoff / "commands").exists() else 0,
            "processed": len(list((handoff / "processed").glob("*.json"))) if (handoff / "processed").exists() else 0,
            "approval_requests": len(list((handoff / "approvals" / "requests").glob("*.json"))) if (handoff / "approvals" / "requests").exists() else 0,
            "bundle_requests": len(list((handoff / "bundle_requests").glob("*.json"))) if (handoff / "bundle_requests").exists() else 0,
        }
    }
    write_json("runtime.json", data)
    write_json("git_status.json", run(["git", "status", "--porcelain=v1", "-b"]))
    write_json("git_last10.json", run(["git", "log", "--oneline", "-10"]))

def make_bundle():
    files = [
        STATE_DIR / "runtime.json",
        STATE_DIR / "git_status.json",
        STATE_DIR / "git_last10.json",
        LOG_DIR / "executor.log",
        LOG_DIR / "watchdog.log",
    ]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = BUNDLES_DIR / f"state_{ts}.zip"
    latest = BUNDLES_DIR / "latest.zip"

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for f in files:
            if f.exists():
                z.write(f, arcname=str(f.relative_to(ROOT)))

    if latest.exists():
        latest.unlink()
    latest.write_bytes(out.read_bytes())

def main():
    print("[STATE] exporter started (every 20s)")
    while True:
        snapshot()
        make_bundle()
        # sem dependência extra
        subprocess.run(["python", "-c", "import time; time.sleep(20)"], check=False)

if __name__ == "__main__":
    main()
