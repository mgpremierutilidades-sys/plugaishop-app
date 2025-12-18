import Ionicons from "@expo/vector-icons/Ionicons";
import type { StyleProp, TextStyle } from "react-native";

export type IconSymbolName = keyof typeof Ionicons.glyphMap;

export type IconSymbolProps = {
  name: IconSymbolName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
