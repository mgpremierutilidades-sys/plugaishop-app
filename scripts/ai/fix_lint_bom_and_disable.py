from pathlib import Path

FILE = Path("app/(tabs)/index.tsx")

# 1) Remove UTF-8 BOM (EF BB BF)
data = FILE.read_bytes()
if data.startswith(b"\xef\xbb\xbf"):
    FILE.write_bytes(data[3:])
    print("[OK] BOM removido:", FILE)
else:
    print("[OK] Sem BOM:", FILE)

# 2) Remove eslint-disable-next-line react-hooks/exhaustive-deps se estiver sobrando
txt = FILE.read_text(encoding="utf-8", errors="ignore").splitlines(True)

before = len(txt)
out = []
removed = 0

for line in txt:
    # remove apenas o disable específico
    if "eslint-disable-next-line" in line and "react-hooks/exhaustive-deps" in line:
        removed += 1
        continue
    out.append(line)

if removed > 0:
    FILE.write_text("".join(out), encoding="utf-8")
    print(f"[OK] Removido {removed} eslint-disable inútil em:", FILE)
else:
    print("[OK] Nenhum eslint-disable desse tipo encontrado em:", FILE)
