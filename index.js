// index.js (raiz do projeto: C:\plugaishop-app\index.js)
import { LogBox } from "react-native";

const IGNORE_TEXT = "SafeAreaView has been deprecated";

// 1) Tenta silenciar pelo LogBox (UI do app)
LogBox.ignoreLogs([IGNORE_TEXT]);

// 2) Silencia no terminal (Metro) interceptando console.warn
const originalWarn = console.warn;
console.warn = (...args) => {
  const first = args?.[0];
  const msg =
    typeof first === "string"
      ? first
      : first && typeof first?.message === "string"
      ? first.message
      : "";

  if (msg.includes(IGNORE_TEXT)) return;

  originalWarn(...args);
};

import "expo-router/entry";

