import type { PropsWithChildren } from "react";
import { View } from "react-native";

type GlobalChromeProps = PropsWithChildren<{ config?: Record<string, unknown> }>;

export function GlobalChrome({ children }: GlobalChromeProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

export default GlobalChrome;
