// scripts/ai/index-generator.mjs
// Gera um índice navegável do bundle: paths + tamanho + mtime + hash (sha1) com limite.
// Uso:
//   node .\scripts\ai\index-generator.mjs --root <pasta> --out <arquivo>

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

const root = argValue("--root");
const out = argValue("--out") ?? "INDEX_AI.json";

if (!root) {
  console.error("Missing --root");
  process.exit(1);
}

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".expo",
  "android",
  "ios",
  "dist",
  "web-build",
]);

const MAX_HASH_BYTES = 1024 * 1024; // 1MB

function sha1File(filePath, size) {
  try {
    const h = crypto.createHash("sha1");
    if (size > MAX_HASH_BYTES) {
      // hash parcial: início do arquivo
      const fd = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(MAX_HASH_BYTES);
      fs.readSync(fd, buf, 0, MAX_HASH_BYTES, 0);
      fs.closeSync(fd);
      h.update(buf);
      h.update(Buffer.from(`|truncated:${size}`));
      return h.digest("hex");
    }
    const data = fs.readFileSync(filePath);
    h.update(data);
    return h.digest("hex");
  } catch {
    return null;
  }
}

function walk(dir, base) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).replaceAll("\\", "/");

    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      files.push(...walk(full, base));
      continue;
    }

    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }

    const size = st.size ?? 0;
    files.push({
      path: rel,
      size,
      mtimeMs: st.mtimeMs ?? 0,
      sha1: sha1File(full, size),
      ext: path.extname(e.name).toLowerCase(),
    });
  }
  return files;
}

const list = walk(path.resolve(root), path.resolve(root));

const byExt = {};
for (const f of list) {
  byExt[f.ext] = (byExt[f.ext] ?? 0) + 1;
}

const index = {
  generatedAt: new Date().toISOString(),
  root: path.resolve(root).replaceAll("\\", "/"),
  totals: {
    files: list.length,
    bytes: list.reduce((a, b) => a + (b.size ?? 0), 0),
  },
  breakdown: {
    byExt,
  },
  files: list,
};

fs.writeFileSync(path.resolve(out), JSON.stringify(index, null, 2), "utf8");
console.log(`Wrote ${out} (${list.length} files)`);
