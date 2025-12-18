import { Ionicons } from "@expo/vector-icons";
import React from "react";
import type { StyleProp, TextStyle } from "react-native";

export type IconSymbolName = React.ComponentProps<typeof Ionicons>["name"];

export function IconSymbol({
  name,
  size = 22,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export default IconSymbol;
