#!/usr/bin/env python3
# scripts/bridge/patch_tools.py
from __future__ import annotations

import re
import subprocess
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple, Dict


@dataclass
class PatchPolicy:
    # Provided by server: validate each file path against allow/deny and repo sandbox
    repo_root: Path
    allow_globs: List[str]
    deny_dirs: set[str]
    deny_patterns: List[str]


_DIFF_FILE_RE = re.compile(r"^(---|\+\+\+) (.+)$")


def _normalize_diff_path(raw: str) -> Optional[str]:
    """
    Accept typical unified diff paths:
      --- a/path/to/file
      +++ b/path/to/file
      --- /dev/null
      +++ /dev/null
    Returns relative posix path without a/ b/ prefixes, or None for /dev/null.
    """
    s = raw.strip()
    if s == "/dev/null":
        return None
    # strip possible timestamps after path, e.g. "a/file\t2026-..."
    s = s.split("\t", 1)[0].split(" ", 1)[0]
    s = s.replace("\\", "/")
    if s.startswith("a/") or s.startswith("b/"):
        s = s[2:]
    s = s.lstrip("/")
    if not s:
        return None
    return s


def extract_touched_paths(patch_text: str) -> List[str]:
    """
    Extract candidate file paths from diff headers. Dedupe and return posix relative paths.
    """
    paths: List[str] = []
    for line in patch_text.splitlines():
        m = _DIFF_FILE_RE.match(line)
        if not m:
            continue
        raw = m.group(2)
        p = _normalize_diff_path(raw)
        if p:
            paths.append(p)
    # Dedupe preserving order
    seen = set()
    out: List[str] = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def git_available() -> bool:
    return shutil.which("git") is not None


def run_git(repo_root: Path, args: List[str], patch_stdin: Optional[str] = None) -> Tuple[int, str, str]:
    """
    Runs git in repo_root. If patch_stdin provided, pipes it to stdin.
    """
    p = subprocess.run(
        ["git", *args],
        cwd=str(repo_root),
        input=patch_stdin,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        errors="replace",
    )
    return p.returncode, p.stdout, p.stderr


def get_git_status_porcelain(repo_root: Path) -> Tuple[int, str, str]:
    return run_git(repo_root, ["status", "--porcelain=v1"])


def validate_clean_worktree(repo_root: Path) -> Tuple[bool, str]:
    code, out, err = get_git_status_porcelain(repo_root)
    if code != 0:
        return False, (err or out or "git status failed")
    if out.strip():
        return False, "working tree not clean (git status not empty)"
    return True, ""


def git_apply_check(repo_root: Path, patch_text: str) -> Tuple[bool, str]:
    # --check ensures nothing is applied
    code, out, err = run_git(repo_root, ["apply", "--check", "--whitespace=nowarn"], patch_stdin=patch_text)
    if code == 0:
        return True, ""
    return False, (err or out or "git apply --check failed")


def git_apply(repo_root: Path, patch_text: str) -> Tuple[bool, str]:
    code, out, err = run_git(repo_root, ["apply", "--whitespace=nowarn"], patch_stdin=patch_text)
    if code == 0:
        return True, ""
    return False, (err or out or "git apply failed")


def git_apply_reverse(repo_root: Path, patch_text: str) -> Tuple[bool, str]:
    code, out, err = run_git(repo_root, ["apply", "-R", "--whitespace=nowarn"], patch_stdin=patch_text)
    if code == 0:
        return True, ""
    return False, (err or out or "git apply -R failed")