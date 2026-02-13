import Ionicons from "@expo/vector-icons/Ionicons";
import type { StyleProp, TextStyle } from "react-native";

export type IconSymbolName = keyof typeof Ionicons.glyphMap;

type Props = {
  name: string;
  color: string;
  size?: number;
  style?: StyleProp<TextStyle>;
};

function normalizeIoniconName(name: string): IconSymbolName {
  const n = (name ?? "").trim();

  // Compat: padrões tipo SF Symbols / wrappers
  if (n === "chevron.right" || n === "chevron-right" || n === "chevronRight") {
    return "chevron-forward";
  }
  if (n === "chevron.left" || n === "chevron-left" || n === "chevronLeft") {
    return "chevron-back";
  }
  if (n === "chevron.up" || n === "chevron-up" || n === "chevronUp") {
    return "chevron-up";
  }
  if (n === "chevron.down" || n === "chevron-down" || n === "chevronDown") {
    return "chevron-down";
  }

  const key = n as IconSymbolName;
  if ((Ionicons as any).glyphMap?.[key]) return key;

  return "help-circle-outline";
}

function IconSymbol({ name, color, size = 22, style }: Props) {
  const iconName = normalizeIoniconName(name);
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}

export { IconSymbol };
export default IconSymbol;
