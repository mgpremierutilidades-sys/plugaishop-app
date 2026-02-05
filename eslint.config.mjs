// eslint.config.mjs
// ESLint Flat Config (ESLint v9+)
// RN/Expo globals + safe defaults.
// Key requirement: have a `files` config so runtime folders are not treated as "ignored".

const tryImport = async (name) => {
  try {
    return await import(name);
  } catch {
    return null;
  }
};

export default (async () => {
  // Optional deps (do not hard-fail if missing)
  const jsMod = await tryImport("@eslint/js");
  const tsEslintMod = await tryImport("typescript-eslint"); // meta package (preferred)
  const tsParserMod = await tryImport("@typescript-eslint/parser");
  const tsPluginMod = await tryImport("@typescript-eslint/eslint-plugin");
  const reactMod = await tryImport("eslint-plugin-react");
  const reactHooksMod = await tryImport("eslint-plugin-react-hooks");
  const importMod = await tryImport("eslint-plugin-import");

  const js = jsMod?.default ?? null;
  const tseslint = tsEslintMod ?? null;

  const parser = tseslint?.parser ?? tsParserMod?.default ?? tsParserMod ?? null;
  const tsPlugin = tseslint?.plugin ?? tsPluginMod?.default ?? tsPluginMod ?? null;

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
    ".expo/**",
  ];

  // React Native / Expo common globals (avoid no-undef false positives)
  const rnGlobals = {
    __DEV__: "readonly",
    console: "readonly",

    process: "readonly",
    require: "readonly",
    __dirname: "readonly",
    __filename: "readonly",

    fetch: "readonly",
    Headers: "readonly",
    Request: "readonly",
    Response: "readonly",

    setTimeout: "readonly",
    clearTimeout: "readonly",
    setInterval: "readonly",
    clearInterval: "readonly",
    setImmediate: "readonly",
    clearImmediate: "readonly",

    alert: "readonly",
  };

  const config = [];

  // Global ignores
  config.push({ ignores });

  // JS base (if available)
  if (js?.configs?.recommended) {
    config.push(js.configs.recommended);
  }

  // Base config that guarantees files are linted (prevents "all ignored")
  config.push({
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: rnGlobals,
      ...(parser ? { parser } : {}),
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      ...(tsPlugin ? { "@typescript-eslint": tsPlugin } : {}),
      ...(react ? { react } : {}),
      ...(reactHooks ? { "react-hooks": reactHooks } : {}),
      ...(importPlugin ? { import: importPlugin } : {}),
    },
    settings: {
      ...(react ? { react: { version: "detect" } } : {}),
    },
    rules: {
      // React Hooks (if plugin exists)
      ...(reactHooks
        ? {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
          }
        : {}),

      // RN/Expo path aliases / metro resolution tends to break import/no-unresolved
      ...(importPlugin
        ? {
            "import/no-unresolved": "off",
          }
        : {}),

      // Base JS rules
      "no-undef": "error",

      // Prefer underscore convention for intentionally unused variables/args
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // Evita o ruído que você estava pegando (double negation)
      "no-extra-boolean-cast": "error",

      // (Opcional) console permitido no MVP
      // Se quiser proibir console em produção depois, a gente troca isso por override.
      "no-console": "off",
    },
  });

  // TS recommended rules (if typescript-eslint meta package exists)
  if (tseslint?.configs?.recommended) {
    config.push({
      files: ["**/*.{ts,tsx}"],
      ...tseslint.configs.recommended,
      rules: {
        ...(tseslint.configs.recommended.rules ?? {}),

        // disable core for TS and use TS version
        "no-unused-vars": "off",
        ...(tsPlugin
          ? {
              "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
              ],
            }
          : {}),
      },
    });
  }

  return config;
})();
