#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class PatchResult:
    path: Path
    changed: bool
    reason: str


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--objective", type=str, default="")
    ap.add_argument("--target-file", type=str, default="")
    args = ap.parse_args()

    if not args.apply:
        ap.print_help()
        return 2

    # Segurança: sempre exigir target-file no v2
    if not args.target_file:
        print("[patch_repo_v2] no target-file provided. no-op for safety.")
        return 0

    tf = (ROOT / args.target_file).resolve()
    try:
        tf.relative_to(ROOT)
    except Exception:
        print("[patch_repo_v2] target-file outside repo. abort.")
        return 1

    # v2 é executor seguro: não altera nada além do alvo.
    print("[patch_repo_v2] changed=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
