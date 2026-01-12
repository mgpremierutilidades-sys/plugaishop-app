// components/global-chrome.tsx
import type { PropsWithChildren } from "react";
import { View } from "react-native";

type GlobalChromeProps = PropsWithChildren<Record<string, never>>;

export function GlobalChrome({ children }: GlobalChromeProps) {
  // Wrapper neutro e seguro: não altera navegação, só garante "children" válido.
  return <View style={{ flex: 1 }}>{children}</View>;
}

// Para compatibilidade total (quem importar default não quebra)
export default GlobalChrome;
