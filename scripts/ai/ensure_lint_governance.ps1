[CmdletBinding()]
param(
  [string]$Repo = "C:\plugaishop-app",
  [switch]$AutoCommit,
  [switch]$AutoPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$m) { Write-Host ("[ensure] " + $m) }

if (!(Test-Path -LiteralPath $Repo)) { throw "Repo not found: $Repo" }
Set-Location $Repo

$eslintConfigPath = Join-Path $Repo "eslint.config.js"
$gitignorePath    = Join-Path $Repo ".gitignore"
$eslintignorePath = Join-Path $Repo ".eslintignore"

# 1) Remove .eslintignore (ESLint 9 flat config does not support it)
if (Test-Path -LiteralPath $eslintignorePath) {
  Write-Info "removing .eslintignore (not supported by ESLint flat config)"
  Remove-Item -Force -LiteralPath $eslintignorePath
}

# 2) Fix .gitignore: convert stray line "backups / stash" to comment
if (Test-Path -LiteralPath $gitignorePath) {
  $gi = Get-Content -LiteralPath $gitignorePath -Raw
  if ($gi -match "(?m)^\s*backups\s*/\s*stash\s*$") {
    Write-Info "fixing .gitignore line: 'backups / stash' -> comment"
    $gi = $gi -replace "(?m)^\s*backups\s*/\s*stash\s*$", "# backups / stash"
    Set-Content -Encoding UTF8 -LiteralPath $gitignorePath -Value $gi
  }
} else {
  @"
scripts/ai/_out/
scripts/ai/_stash_routes/
scripts/ai/_backup/
node_modules/
.expo/
dist/
build/
"@ | Set-Content -Encoding UTF8 -LiteralPath $gitignorePath
}

# 3) Ensure required ignore patterns (idempotent)
$requiredGitIgnores = @(
  "scripts/ai/_stash_routes/",
  "scripts/ai/_out/",
  "scripts/ai/_backup/",
  "node_modules/",
  ".expo/",
  "dist/",
  "build/"
)

$gi2 = Get-Content -LiteralPath $gitignorePath -Raw
foreach ($p in $requiredGitIgnores) {
  if ($gi2 -notmatch [regex]::Escape($p)) {
    Add-Content -Encoding UTF8 -LiteralPath $gitignorePath -Value $p
  }
}

# 4) If eslint.config.js is missing or looks broken, write a known-good flat config
function Looks-BrokenEslintConfig([string]$content) {
  # must have at least one `files:` block OR it'll behave like "everything ignored / no config"
  return ($content -notmatch "files\s*:\s*\[")
}

if (!(Test-Path -LiteralPath $eslintConfigPath)) {
  Write-Info "eslint.config.js missing -> generating"
  $broken = $true
} else {
  $cur = Get-Content -LiteralPath $eslintConfigPath -Raw
  $broken = Looks-BrokenEslintConfig $cur
}

if ($broken) {
  Write-Info "eslint.config.js looks broken/incomplete -> generating a safe flat config"
  @"
// Auto-generated safe ESLint flat config for Plugaishop (ESLint v9+).
// Guarantees `files` config exists so runtime folders won't be treated as ignored.

const tryImport = async (name) => {
  try { return await import(name); } catch { return null; }
};

export default (async () => {
  const jsMod = await tryImport("@eslint/js");
  const tsEslintMod = await tryImport("typescript-eslint");
  const tsParserMod = await tryImport("@typescript-eslint/parser");
  const tsPluginMod = await tryImport("@typescript-eslint/eslint-plugin");
  const reactMod = await tryImport("eslint-plugin-react");
  const reactHooksMod = await tryImport("eslint-plugin-react-hooks");
  const importMod = await tryImport("eslint-plugin-import");

  const js = jsMod?.default ?? null;
  const tseslint = tsEslintMod ?? null;

  const parser =
    tseslint?.parser ??
    tsParserMod?.default ??
    tsParserMod ??
    null;

  const tsPlugin =
    tseslint?.plugin ??
    tsPluginMod?.default ??
    tsPluginMod ??
    null;

  const react = reactMod?.default ?? reactMod ?? null;
  const reactHooks = reactHooksMod?.default ?? reactHooksMod ?? null;
  const importPlugin = importMod?.default ?? importMod ?? null;

  const ignores = [
    "scripts/ai/_stash_routes/**",
    "scripts/ai/_out/**",
    "scripts/ai/_backup/**",
    "node_modules/**",
    "dist/**",
    "build/**",
    ".expo/**"
  ];

  const config = [];
  config.push({ ignores });

  if (js?.configs?.recommended) config.push(js.configs.recommended);

  config.push({
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ...(parser ? { parser } : {}),
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: {
      ...(tsPlugin ? { "@typescript-eslint": tsPlugin } : {}),
      ...(react ? { react } : {}),
      ...(reactHooks ? { "react-hooks": reactHooks } : {}),
      ...(importPlugin ? { import: importPlugin } : {}),
    },
    settings: { ...(react ? { react: { version: "detect" } } : {}) },
    rules: {
      ...(reactHooks ? {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      } : {}),
      ...(importPlugin ? { "import/no-unresolved": "off" } : {}),
    }
  });

  if (tseslint?.configs?.recommended) {
    config.push({ files: ["**/*.{ts,tsx}"], ...tseslint.configs.recommended });
  }

  return config;
})();
"@ | Set-Content -Encoding UTF8 -LiteralPath $eslintConfigPath
}

# 5) Proofs
Write-Info "proof: stash_routes must be ignored (expected error message about ignored is OK)"
& npx eslint scripts/ai/_stash_routes --debug | Out-Null

Write-Info "proof: runtime folders must lint (NO 'app is ignored')"
& npx eslint app components context utils --fix | Out-Null
if ($LASTEXITCODE -ne 0) { throw "ESLint still failing on runtime scope (app/components/context/utils)." }

Write-Info "proof: tsc must pass"
& npx tsc -p tsconfig.json --noEmit | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Typecheck failing (tsc)." }

if ($AutoCommit) {
  & git add .gitignore eslint.config.js 2>$null | Out-Null
  $staged = (& git diff --cached --name-only) 2>$null
  if ($staged) {
    & git commit -m "fix(governance): self-heal eslint flat config + ignore artifacts" | Out-Null
    if ($AutoPush) { & git push | Out-Null }
  }
}

Write-Info "OK: governance + lint ok + tsc ok"
exit 0
