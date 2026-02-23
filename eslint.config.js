// PATH: eslint.config.js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      // AI artifacts
      "scripts/ai/_out/**",
      "scripts/ai/_state/**",

      // Backups e dumps que NAO fazem parte do app
      "_backup_*/**",
      "_zips_parts_*/**",
      "**/_backup_*/**",
      "**/_zips_parts_*/**",

      // Common
      "node_modules/**",
      "dist/**",
      "build/**",
      ".expo/**",
    ],
  },
]);