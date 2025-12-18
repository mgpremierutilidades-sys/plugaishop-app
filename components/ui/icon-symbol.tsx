// components/ui/icon-symbol.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export type IconSymbolName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  name: IconSymbolName;
  size?: number;
  color?: string;
  style?: any;
};

export default function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: Props) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
