#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

ROOT = Path(__file__).resolve().parents[2]

@dataclass(frozen=True)
class PatchResult:
    path: Path
    changed: bool
    reason: str

def read_text(p: Path) -> Optional[str]:
    if not p.exists():
        return None
    return p.read_text(encoding="utf-8", errors="replace")

def write_text(p: Path, s: str) -> None:
    s = s.replace("\r\n", "\n")
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8", errors="replace", newline="\n") as f:
        f.write(s)

def ensure_field_in_export_type(ts: str, type_name: str, field_line: str) -> tuple[str, bool]:
    m = re.search(rf"(export\s+type\s+{re.escape(type_name)}\s*=\s*\{{)([\s\S]*?)(\n\}};)", ts)
    if not m:
        return ts, False
    head, body, tail = m.group(1), m.group(2), m.group(3)

    field_name = field_line.strip().split(":")[0].strip()
    if re.search(rf"\n\s*{re.escape(field_name)}\s*:", body):
        return ts, False

    new_body = body.rstrip() + "\n  " + field_line.rstrip() + "\n"
    out = ts[:m.start()] + head + new_body + tail + ts[m.end():]
    return out, True

def ensure_exported_order_type(ts: str) -> tuple[str, bool]:
    if re.search(r"export\s+type\s+Order\s*=", ts):
        return ts, False

    insert = """
export type Order = {
  id: string;
  createdAt: string;

  items: OrderItem[];
  selectedItemIds: string[];

  coupon?: OrderCoupon | null;

  shipping?: Shipping | null;
  address?: Address | null;
  payment?: Payment | null;

  protectionById?: Record<string, number>;

  pricing?: OrderPricingSnapshot;
  pricingHash?: string;

  subtotal?: number;
  discount?: number;
  total?: number;

  note?: string;

  status?: "created" | "paid" | "shipped" | "delivered" | "canceled" | string;
  review?: { stars: number; comment?: string } | null;
};
""".lstrip("\n")

    m = re.search(r"(export\s+type\s+OrderDraft\s*=\s*\{[\s\S]*?\n\};)", ts)
    if m:
        out = ts[:m.end()] + "\n\n" + insert + "\n" + ts[m.end():]
        return out, True

    return ts.rstrip() + "\n\n" + insert + "\n", True

def patch_parallax_scrollview_props(ts: str) -> tuple[str, bool]:
    if "scrollViewProps=" in ts:
        return ts, False

    pat = re.compile(
        r"(ParallaxScrollView[\s\S]*?\n)(\s*)onScroll=\{(\([\s\S]*?\})\}\s*\n\2scrollEventThrottle=\{(\d+)\}",
        re.M,
    )
    m = pat.search(ts)
    if not m:
        return ts, False

    before = m.group(1)
    indent = m.group(2)
    onscroll_body = m.group(3)
    throttle = m.group(4)

    repl = (
        f"{before}"
        f"{indent}scrollViewProps={{{{\n"
        f"{indent}  onScroll: {onscroll_body},\n"
        f"{indent}  scrollEventThrottle: {throttle},\n"
        f"{indent}}}}}"
    )
    out = ts[:m.start()] + repl + ts[m.end():]
    return out, True

def patch_useHomeScreenTelemetry_cast(ts: str) -> tuple[str, bool]:
    changed = False
    out = ts
    for ev in ["view_home", "click_home", "fail_home"]:
        out2 = re.sub(rf'track\("{ev}"\s*,', f'track("{ev}" as any,', out)
        if out2 != out:
            changed = True
            out = out2
    return out, changed

def patch_cart_rows_cartitem_product(ts: str) -> tuple[str, bool]:
    changed = False
    out = ts
    replacements = [
        (r"\bit\.title\b", "it.product?.title"),
        (r"\bit\.price\b", "it.product?.price"),
        (r"\bit\.image\b", "it.product?.image"),
        (r"\bit\.discountPercent\b", "it.product?.discountPercent"),
        (r"\bit\.unitLabel\b", "it.product?.unitLabel"),
    ]
    for a, b in replacements:
        out2 = re.sub(a, b, out)
        if out2 != out:
            changed = True
            out = out2
    return out, changed

def ensure_shipping_option_deadline_in_file(ts: str) -> tuple[str, bool]:
    m = re.search(r"(export\s+type\s+ShippingOption\s*=\s*\{)([\s\S]*?)(\n\};)", ts)
    if not m:
        m = re.search(r"(type\s+ShippingOption\s*=\s*\{)([\s\S]*?)(\n\};)", ts)
    if not m:
        return ts, False

    head, body, tail = m.group(1), m.group(2), m.group(3)
    if re.search(r"\n\s*deadline\s*:", body):
        return ts, False

    new_body = body.rstrip() + "\n  deadline?: string;\n"
    out = ts[:m.start()] + head + new_body + tail + ts[m.end():]
    return out, True

def find_files_containing(pattern: str, roots: Iterable[Path]) -> list[Path]:
    hits: list[Path] = []
    rx = re.compile(pattern)
    for r in roots:
        if not r.exists():
            continue
        for p in r.rglob("*.ts"):
            try:
                t = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            if rx.search(t):
                hits.append(p)
        for p in r.rglob("*.tsx"):
            try:
                t = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            if rx.search(t):
                hits.append(p)

    uniq: list[Path] = []
    seen: set[str] = set()
    for p in hits:
        k = str(p.resolve()).lower()
        if k in seen:
            continue
        seen.add(k)
        uniq.append(p)
    return uniq

def apply() -> list[PatchResult]:
    results: list[PatchResult] = []

    order_ts = ROOT / "types" / "order.ts"
    t = read_text(order_ts)
    if t is not None:
        t2, c1 = ensure_field_in_export_type(t, "Payment", 'status?: "pending" | "paid" | "failed";')
        t3, c2 = ensure_field_in_export_type(t2, "Shipping", "deadline?: string;")
        t4, c3 = ensure_exported_order_type(t3)
        if c1 or c2 or c3:
            write_text(order_ts, t4)
            results.append(PatchResult(order_ts, True, "order/payment/shipping types"))

    home = ROOT / "app" / "(tabs)" / "index.tsx"
    t = read_text(home)
    if t is not None:
        t2, c = patch_parallax_scrollview_props(t)
        if c:
            write_text(home, t2)
            results.append(PatchResult(home, True, "parallax scrollViewProps"))

    telem_hook = ROOT / "hooks" / "useHomeScreenTelemetry.ts"
    t = read_text(telem_hook)
    if t is not None:
        t2, c = patch_useHomeScreenTelemetry_cast(t)
        if c:
            write_text(telem_hook, t2)
            results.append(PatchResult(telem_hook, True, "cast telemetry events"))

    cart_rows = ROOT / "src" / "cart" / "useCartRows.ts"
    t = read_text(cart_rows)
    if t is not None:
        t2, c = patch_cart_rows_cartitem_product(t)
        if c:
            write_text(cart_rows, t2)
            results.append(PatchResult(cart_rows, True, "cart item -> product fields"))

    candidates = find_files_containing(r"type\s+ShippingOption\s*=", [ROOT / "types", ROOT / "utils", ROOT])
    for p in candidates[:5]:
        tt = read_text(p)
        if tt is None:
            continue
        tt2, c = ensure_shipping_option_deadline_in_file(tt)
        if c:
            write_text(p, tt2)
            results.append(PatchResult(p, True, "ShippingOption.deadline"))
            break

    return results

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="apply patches")
    args = ap.parse_args()

    if args.apply:
        res = apply()
        changed = [r for r in res if r.changed]
        print(f"[patch_repo] changed={len(changed)}")
        for r in changed:
            print(f" - {r.path.relative_to(ROOT)} ({r.reason})")
        return 0

    ap.print_help()
    return 2

if __name__ == "__main__":
    raise SystemExit(main())