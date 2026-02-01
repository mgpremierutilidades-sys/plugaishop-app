// eslint.config.js (ESLint Flat Config)
// Base: eslint-config-expo/flat
// Ajustes Windows/React-Native:
// - Desliga import/namespace: evita o plugin tentar parsear react-native/index.js
// - Mantém import/no-unresolved, mas ignora react-native e expo-* (resolver pode falhar no Windows)

const expoFlat = require("eslint-config-expo/flat");

module.exports = [
  ...expoFlat,

  {
    // Evita ruído e erros por parsing de módulos RN/Expo dentro do node_modules
    settings: {
      "import/ignore": ["^react-native$", "^react-native/", "^expo-"],
    },

    rules: {
      // ESSENCIAL: isso é o que causa "Parse errors in imported module 'react-native'"
      "import/namespace": "off",

      // Mantém regra útil, mas não trava por RN/Expo
      "import/no-unresolved": [
        "error",
        {
          ignore: ["^react-native$", "^react-native/", "^expo-"],
        },
      ],
    },
  },
];
