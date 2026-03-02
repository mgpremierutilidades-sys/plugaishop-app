// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },

  // Fix CI: eslint-plugin-import às vezes não resolve módulos Expo nativos no runner
  {
    rules: {
      "import/no-unresolved": [
        "error",
        {
          ignore: [
            "^expo-local-authentication$",
            "^expo-clipboard$",
          ],
        },
      ],
    },
  },
]);