import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const MODE = process.argv[2] || "check"; // check | fix

const IGNORE_DIRS = new Set([
  ".git",
  ".expo",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
]);

const EXT_ALLOW = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".css",
  ".scss",
  ".txt",
]);

function isUtf8Bom(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walk(full, out);
      continue;
    }

    if (!e.isFile()) continue;

    const ext = path.extname(e.name).toLowerCase();
    if (!EXT_ALLOW.has(ext)) continue;

    out.push(full);
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

const files = [];
walk(ROOT, files);

let bomCount = 0;
const bomFiles = [];

for (const f of files) {
  let buf;
  try {
    buf = fs.readFileSync(f);
  } catch {
    continue;
  }

  if (!isUtf8Bom(buf)) continue;

  bomCount += 1;
  bomFiles.push(f);

  if (MODE === "fix") {
    const next = buf.subarray(3);
    fs.writeFileSync(f, next);
  }
}

if (bomCount > 0) {
  console.log(`Found UTF-8 BOM in ${bomCount} file(s):`);
  for (const f of bomFiles) console.log(`- ${rel(f)}`);

  if (MODE === "fix") {
    console.log("BOM removed.");
    process.exit(0);
  }

  process.exit(1);
}

console.log("OK: no UTF-8 BOM found.");
process.exit(0);
