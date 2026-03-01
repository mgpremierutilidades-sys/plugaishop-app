#!/usr/bin/env python3
# scripts/bridge/bridge_server.py
"""
Plugaishop Local Bridge (Claude-like)
- Read-only by default
- Token auth
- Repo-root sandbox
- Optional controlled "plan apply" to create architecture/files
- BRIDGE-003: unified diff validate/apply/revert via git apply (with dry-run + guardrails)

Run:
  python scripts/bridge/bridge_server.py --repo "E:\\plugaishopp-app" --token "CHANGE_ME"

Endpoints (JSON):
  GET  /health
  POST /repo/tree
  POST /repo/read
  POST /repo/search
  POST /git/status
  POST /git/diff
  POST /plan/validate
  POST /plan/apply
  POST /patch/validate
  POST /patch/apply
  POST /patch/revert
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from scripts.bridge.patch_tools import (
    extract_touched_paths,
    git_available,
    validate_clean_worktree,
    git_apply_check,
    git_apply,
    git_apply_reverse,
)

DEFAULT_PORT = 8732

# Conservative denylist
DENY_PATTERNS = [
    ".env", ".env.*", "*.pem", "*.p12", "*.pfx", "*.key", "*id_rsa*", "*id_ed25519*",
    "secrets.*", "*secret*", "*token*", "*private*key*",
]
DENY_DIRS = {
    ".git", "node_modules", "dist", "dist-web", "build", ".expo", ".next", ".turbo",
    "android", "ios",
}

# Allowlist for "normal project context"
ALLOW_GLOBS_DEFAULT = [
    "package.json",
    "tsconfig.json",
    "app/**",
    "components/**",
    "constants/**",
    "context/**",
    "data/**",
    "hooks/**",
    "utils/**",
    "types/**",
    ".github/**",
    "README.md",
    "scripts/**",
]


@dataclass
class BridgeConfig:
    repo_root: Path
    token: str
    readonly: bool
    allow_write: bool
    allow_apply_plan: bool
    allow_git: bool
    allow_patch_apply: bool
    allow_globs: List[str]


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: Dict[str, Any]) -> None:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def _read_json(handler: BaseHTTPRequestHandler) -> Dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {}


def _is_denied_path(rel_posix: str) -> bool:
    rel = rel_posix.replace("\\", "/").lower()
    parts = rel.split("/")
    if any(p in DENY_DIRS for p in parts):
        return True
    name = parts[-1]
    for pat in DENY_PATTERNS:
        if fnmatch.fnmatch(name, pat.lower()) or fnmatch.fnmatch(rel, pat.lower()):
            return True
    return False


def _matches_allowlist(rel_posix: str, allow_globs: List[str]) -> bool:
    rel = rel_posix.replace("\\", "/")
    for g in allow_globs:
        gposix = g.replace("\\", "/")
        if fnmatch.fnmatch(rel, gposix):
            return True
        if gposix.endswith("/**"):
            base = gposix[:-3]
            if rel.startswith(base.rstrip("/") + "/"):
                return True
    return False


def _resolve_repo_path(cfg: BridgeConfig, rel_path: str) -> Tuple[Optional[Path], Optional[str]]:
    rel = rel_path.strip().lstrip("/").replace("\\", "/")
    if rel == "":
        return None, "Empty path"
    if ".." in rel.split("/"):
        return None, "Path traversal denied"
    if _is_denied_path(rel):
        return None, "Denied by policy (secrets/blocked dirs)"
    if not _matches_allowlist(rel, cfg.allow_globs):
        return None, "Not in allowlist"
    abs_path = (cfg.repo_root / Path(rel)).resolve()
    try:
        abs_path.relative_to(cfg.repo_root.resolve())
    except Exception:
        return None, "Out of repo root"
    return abs_path, None


def _run_git(cfg: BridgeConfig, args: List[str]) -> Tuple[int, str, str]:
    if not cfg.allow_git:
        return 403, "", "git disabled"
    if shutil.which("git") is None:
        return 500, "", "git not found"
    p = subprocess.run(
        ["git", *args],
        cwd=str(cfg.repo_root),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return p.returncode, p.stdout, p.stderr


def _safe_text_preview(s: str, max_chars: int = 200_000) -> str:
    return s if len(s) <= max_chars else s[:max_chars] + "\n\n[TRUNCATED]\n"


def validate_plan(cfg: BridgeConfig, plan: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if "actions" not in plan or not isinstance(plan["actions"], list):
        return False, ["plan.actions must be a list"]

    for i, act in enumerate(plan["actions"]):
        if not isinstance(act, dict):
            errors.append(f"actions[{i}] must be object")
            continue
        t = act.get("type")
        rel = act.get("path")
        if t not in ("mkdir", "write_file"):
            errors.append(f"actions[{i}].type invalid: {t}")
            continue
        if not isinstance(rel, str) or not rel.strip():
            errors.append(f"actions[{i}].path must be non-empty string")
            continue
        abs_path, err = _resolve_repo_path(cfg, rel)
        if err:
            errors.append(f"actions[{i}].path denied: {rel} ({err})")
            continue
        if t == "write_file":
            content = act.get("content", "")
            if not isinstance(content, str):
                errors.append(f"actions[{i}].content must be string")
            if len(content.encode("utf-8")) > 600_000:
                errors.append(f"actions[{i}] content too large (>600KB)")
    return len(errors) == 0, errors


def apply_plan(cfg: BridgeConfig, plan: Dict[str, Any], dry_run: bool) -> Dict[str, Any]:
    ok, errors = validate_plan(cfg, plan)
    if not ok:
        return {"ok": False, "errors": errors}

    results: List[Dict[str, Any]] = []
    for act in plan["actions"]:
        t = act["type"]
        rel = act["path"].strip().lstrip("/").replace("\\", "/")
        abs_path, err = _resolve_repo_path(cfg, rel)
        if err or abs_path is None:
            results.append({"type": t, "path": rel, "ok": False, "error": err or "invalid"})
            continue

        if t == "mkdir":
            if dry_run:
                results.append({"type": t, "path": rel, "ok": True, "dry_run": True})
            else:
                abs_path.mkdir(parents=True, exist_ok=True)
                results.append({"type": t, "path": rel, "ok": True})
        elif t == "write_file":
            parent = abs_path.parent
            content = act.get("content", "")
            if dry_run:
                results.append({"type": t, "path": rel, "ok": True, "bytes": len(content.encode("utf-8")), "dry_run": True})
            else:
                parent.mkdir(parents=True, exist_ok=True)
                abs_path.write_text(content, encoding="utf-8")
                results.append({"type": t, "path": rel, "ok": True, "bytes": len(content.encode("utf-8"))})

    return {"ok": True, "dry_run": dry_run, "results": results}


def validate_patch(cfg: BridgeConfig, patch_text: str) -> Tuple[bool, List[str], List[str]]:
    """
    Returns: ok, errors, touched_paths
    """
    errors: List[str] = []
    touched = extract_touched_paths(patch_text)

    if not touched:
        errors.append("patch touches no files (could not parse diff headers)")

    for p in touched:
        # policy checks via resolver
        _, err = _resolve_repo_path(cfg, p)
        if err:
            errors.append(f"denied path: {p} ({err})")

    # hard requirement for robust patch apply
    if not git_available():
        errors.append("git not found; patch apply requires git installed")

    return len(errors) == 0, errors, touched


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "PlugaishopBridge/1.1"

    def do_GET(self) -> None:
        if self.path == "/health":
            _json_response(self, 200, {"ok": True})
            return
        _json_response(self, 404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:
        cfg: BridgeConfig = self.server.cfg  # type: ignore[attr-defined]

        # Auth
        token = self.headers.get("X-Bridge-Token", "")
        if token != cfg.token:
            _json_response(self, 401, {"ok": False, "error": "unauthorized"})
            return

        body = _read_json(self)

        if self.path == "/repo/tree":
            rel = str(body.get("path", "") or ".").strip()
            max_entries = int(body.get("maxEntries", 2000))
            out: List[str] = []
            root = cfg.repo_root

            base = root if rel in (".", "") else _resolve_repo_path(cfg, rel)[0]
            if base is None:
                _json_response(self, 400, {"ok": False, "error": "invalid base path"})
                return

            for p in base.rglob("*"):
                if len(out) >= max_entries:
                    break
                if p.is_dir():
                    continue
                relp = p.relative_to(root).as_posix()
                if _is_denied_path(relp):
                    continue
                if not _matches_allowlist(relp, cfg.allow_globs):
                    continue
                out.append(relp)

            _json_response(self, 200, {"ok": True, "entries": out, "truncated": len(out) >= max_entries})
            return

        if self.path == "/repo/read":
            rel = str(body.get("path", "")).strip()
            abs_path, err = _resolve_repo_path(cfg, rel)
            if err or abs_path is None:
                _json_response(self, 403, {"ok": False, "error": err or "denied"})
                return
            if not abs_path.exists() or not abs_path.is_file():
                _json_response(self, 404, {"ok": False, "error": "file not found"})
                return
            max_bytes = int(body.get("maxBytes", 200_000))
            data = abs_path.read_bytes()
            if len(data) > max_bytes:
                data = data[:max_bytes]
                truncated = True
            else:
                truncated = False
            text = data.decode("utf-8", errors="replace")
            _json_response(self, 200, {"ok": True, "path": rel, "content": text, "truncated": truncated})
            return

        if self.path == "/repo/search":
            query = str(body.get("query", "")).strip()
            if not query:
                _json_response(self, 400, {"ok": False, "error": "query required"})
                return
            max_hits = int(body.get("maxHits", 50))
            pattern = re.compile(re.escape(query), re.IGNORECASE)

            hits: List[Dict[str, Any]] = []
            for p in cfg.repo_root.rglob("*"):
                if p.is_dir():
                    continue
                relp = p.relative_to(cfg.repo_root).as_posix()
                if _is_denied_path(relp) or not _matches_allowlist(relp, cfg.allow_globs):
                    continue
                try:
                    txt = p.read_text(encoding="utf-8", errors="replace")
                except Exception:
                    continue
                for m in pattern.finditer(txt):
                    if len(hits) >= max_hits:
                        break
                    start = max(m.start() - 60, 0)
                    end = min(m.end() + 60, len(txt))
                    snippet = txt[start:end].replace("\n", "\\n")
                    hits.append({"path": relp, "index": m.start(), "snippet": snippet})
                if len(hits) >= max_hits:
                    break

            _json_response(self, 200, {"ok": True, "hits": hits, "truncated": len(hits) >= max_hits})
            return

        if self.path == "/git/status":
            code, out, err = _run_git(cfg, ["status", "--porcelain=v1", "-b"])
            _json_response(self, 200 if code == 0 else 500, {"ok": code == 0, "stdout": _safe_text_preview(out), "stderr": _safe_text_preview(err)})
            return

        if self.path == "/git/diff":
            args = ["diff"]
            if body.get("staged", False):
                args = ["diff", "--cached"]
            if "paths" in body and isinstance(body["paths"], list) and body["paths"]:
                safe_paths: List[str] = []
                for rp in body["paths"]:
                    if not isinstance(rp, str):
                        continue
                    abs_path, e = _resolve_repo_path(cfg, rp)
                    if e or abs_path is None:
                        continue
                    safe_paths.append(rp.replace("\\", "/"))
                args += ["--", *safe_paths]
            code, out, err = _run_git(cfg, args)
            _json_response(self, 200 if code == 0 else 500, {"ok": code == 0, "stdout": _safe_text_preview(out), "stderr": _safe_text_preview(err)})
            return

        if self.path == "/plan/validate":
            if cfg.readonly or not cfg.allow_apply_plan:
                _json_response(self, 403, {"ok": False, "error": "plan disabled"})
                return
            ok, errors = validate_plan(cfg, body)
            _json_response(self, 200, {"ok": ok, "errors": errors})
            return

        if self.path == "/plan/apply":
            if cfg.readonly or not cfg.allow_apply_plan or not cfg.allow_write:
                _json_response(self, 403, {"ok": False, "error": "apply disabled"})
                return
            dry_run = bool(body.get("dryRun", True))
            res = apply_plan(cfg, body, dry_run=dry_run)
            _json_response(self, 200 if res.get("ok") else 400, res)
            return

        # ===== BRIDGE-003: PATCH =====
        if self.path == "/patch/validate":
            patch_text = str(body.get("patch", "") or "")
            if not patch_text.strip():
                _json_response(self, 400, {"ok": False, "error": "patch required"})
                return
            ok, errors, touched = validate_patch(cfg, patch_text)
            _json_response(self, 200, {"ok": ok, "errors": errors, "touched": touched})
            return

        if self.path == "/patch/apply":
            if cfg.readonly or not cfg.allow_write or not cfg.allow_patch_apply:
                _json_response(self, 403, {"ok": False, "error": "patch apply disabled"})
                return

            patch_text = str(body.get("patch", "") or "")
            dry_run = bool(body.get("dryRun", True))
            force = bool(body.get("force", False))

            ok, errors, touched = validate_patch(cfg, patch_text)
            if not ok:
                _json_response(self, 400, {"ok": False, "errors": errors, "touched": touched})
                return

            # Guardrail: require clean worktree unless force
            clean_ok, clean_msg = validate_clean_worktree(cfg.repo_root)
            if not clean_ok and not force:
                _json_response(self, 409, {"ok": False, "error": clean_msg, "hint": "Commit/stash changes or retry with force=true"})
                return

            # Always check first
            check_ok, check_err = git_apply_check(cfg.repo_root, patch_text)
            if not check_ok:
                _json_response(self, 400, {"ok": False, "error": check_err, "touched": touched})
                return

            if dry_run:
                _json_response(self, 200, {"ok": True, "dry_run": True, "touched": touched})
                return

            apply_ok, apply_err = git_apply(cfg.repo_root, patch_text)
            if not apply_ok:
                _json_response(self, 500, {"ok": False, "error": apply_err, "touched": touched})
                return

            _json_response(self, 200, {"ok": True, "dry_run": False, "touched": touched})
            return

        if self.path == "/patch/revert":
            if cfg.readonly or not cfg.allow_write or not cfg.allow_patch_apply:
                _json_response(self, 403, {"ok": False, "error": "patch revert disabled"})
                return

            patch_text = str(body.get("patch", "") or "")
            dry_run = bool(body.get("dryRun", True))
            force = bool(body.get("force", False))

            ok, errors, touched = validate_patch(cfg, patch_text)
            if not ok:
                _json_response(self, 400, {"ok": False, "errors": errors, "touched": touched})
                return

            clean_ok, clean_msg = validate_clean_worktree(cfg.repo_root)
            if not clean_ok and not force:
                _json_response(self, 409, {"ok": False, "error": clean_msg, "hint": "Commit/stash changes or retry with force=true"})
                return

            # For revert dry-run, use --check on reverse by actually checking with git apply -R --check
            # Implemented via git_apply_reverse after a check:
            # We'll do: git apply -R --check
            # (reuse patch_tools by calling run_git is internal there; simpler here: call reverse and if dryRun => check only)
            if dry_run:
                # run reverse check
                import scripts.bridge.patch_tools as pt
                code, out, err = pt.run_git(cfg.repo_root, ["apply", "-R", "--check", "--whitespace=nowarn"], patch_stdin=patch_text)
                if code != 0:
                    _json_response(self, 400, {"ok": False, "error": err or out or "git apply -R --check failed", "touched": touched})
                    return
                _json_response(self, 200, {"ok": True, "dry_run": True, "touched": touched})
                return

            rev_ok, rev_err = git_apply_reverse(cfg.repo_root, patch_text)
            if not rev_ok:
                _json_response(self, 500, {"ok": False, "error": rev_err, "touched": touched})
                return

            _json_response(self, 200, {"ok": True, "dry_run": False, "touched": touched})
            return

        _json_response(self, 404, {"ok": False, "error": "not found"})

    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="Repo root, e.g. E:\\plugaishopp-app")
    ap.add_argument("--token", required=True, help="Auth token (keep private)")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--readonly", action="store_true", default=False)
    ap.add_argument("--allow-write", action="store_true", default=False)
    ap.add_argument("--allow-apply-plan", action="store_true", default=False)
    ap.add_argument("--allow-patch-apply", action="store_true", default=False)
    ap.add_argument("--disallow-git", action="store_true", default=False)
    ap.add_argument("--allow-glob", action="append", default=[], help="Extra allow glob (repeatable)")
    args = ap.parse_args()

    repo_root = Path(args.repo).resolve()
    if not repo_root.exists():
        raise SystemExit(f"Repo root not found: {repo_root}")

    cfg = BridgeConfig(
        repo_root=repo_root,
        token=args.token,
        readonly=bool(args.readonly),
        allow_write=bool(args.allow_write),
        allow_apply_plan=bool(args.allow_apply_plan),
        allow_git=not bool(args.disallow_git),
        allow_patch_apply=bool(args.allow_patch_apply),
        allow_globs=ALLOW_GLOBS_DEFAULT + list(args.allow_glob or []),
    )

    httpd = HTTPServer(("127.0.0.1", args.port), BridgeHandler)
    httpd.cfg = cfg  # type: ignore[attr-defined]

    print(f"[bridge] repo={cfg.repo_root}")
    print(f"[bridge] listening http://127.0.0.1:{args.port}")
    print(f"[bridge] readonly={cfg.readonly} allow_write={cfg.allow_write} allow_apply_plan={cfg.allow_apply_plan} allow_patch_apply={cfg.allow_patch_apply} allow_git={cfg.allow_git}")
    print("[bridge] token is required in X-Bridge-Token header")
    httpd.serve_forever()


if __name__ == "__main__":
    main()