import Ionicons from "@expo/vector-icons/Ionicons";
import type { StyleProp, TextStyle } from "react-native";

export type IconSymbolName = keyof typeof Ionicons.glyphMap;

export type IconSymbolProps = {
  /**
   * Aceita nomes do Ionicons e também aliases tipo:
   * - "house.fill"
   * - "person.fill"
   * - "chevron.right"
   */
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

function normalizeIoniconName(name: string): IconSymbolName {
  const n = (name ?? "").trim();

  // Aliases (SF-like / wrappers antigos)
  if (n === "house.fill" || n === "house") return "home-outline";
  if (n === "compass.fill" || n === "compass") return "compass-outline";
  if (n === "cart.fill" || n === "cart") return "cart-outline";
  if (n === "person.fill" || n === "person") return "person-outline";
  if (n === "bag.fill" || n === "bag") return "bag-outline";

  // Chevrons
  if (n === "chevron.right" || n === "chevron-right" || n === "chevronRight")
    return "chevron-forward";
  if (n === "chevron.left" || n === "chevron-left" || n === "chevronLeft")
    return "chevron-back";
  if (n === "chevron.up" || n === "chevron-up" || n === "chevronUp")
    return "chevron-up";
  if (n === "chevron.down" || n === "chevron-down" || n === "chevronDown")
    return "chevron-down";

  // Arrows
  if (n === "arrow.left" || n === "arrow-back" || n === "arrowBack")
    return "arrow-back";
  if (n === "arrow.right" || n === "arrow-forward" || n === "arrowForward")
    return "arrow-forward";

  // Se já for um nome válido do Ionicons, mantém
  const key = n as IconSymbolName;
  if ((Ionicons as any).glyphMap?.[key]) return key;

  // Fallback seguro
  return "help-circle-outline";
}

export function IconSymbol({
  name,
  color = "#111",
  size = 22,
  style,
}: IconSymbolProps) {
  const iconName = normalizeIoniconName(name);
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}

export default IconSymbol;
