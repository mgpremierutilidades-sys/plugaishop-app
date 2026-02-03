# scripts/ai/fix-mojibake.py
import sys
from pathlib import Path

def fix_mojibake(s: str) -> str:
    # padrão clássico: UTF-8 bytes interpretados como latin1/cp1252
    # "RevisÃ£o" -> "Revisão"
    try:
        b = s.encode("latin1", errors="strict")
        return b.decode("utf-8", errors="strict")
    except Exception:
        return s

def score(s: str) -> int:
    # quanto menor, melhor (menos sinais típicos de mojibake)
    bad = ["Ã", "Â", "â", "�"]
    return sum(s.count(x) for x in bad)

def process_file(p: Path) -> bool:
    raw = p.read_text(encoding="utf-8", errors="replace")
    fixed = fix_mojibake(raw)

    if fixed == raw:
        return False

    if score(fixed) >= score(raw):
        # não melhora -> não toca
        return False

    bak = p.with_suffix(p.suffix + ".bak")
    bak.write_text(raw, encoding="utf-8")
    p.write_text(fixed, encoding="utf-8")
    return True

def main():
    if len(sys.argv) < 2:
        print("usage: python scripts/ai/fix-mojibake.py <file1> <file2> ...")
        sys.exit(2)

    changed = 0
    for arg in sys.argv[1:]:
        p = Path(arg)
        if not p.exists():
            print(f"[skip] missing: {p}")
            continue
        if process_file(p):
            changed += 1
            print(f"[ok] fixed: {p}")
        else:
            print(f"[no] unchanged: {p}")

    print(f"done. changed={changed}")

if __name__ == "__main__":
    main()
