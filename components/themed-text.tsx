// components/themed-text.tsx
import React from "react";
import { Text, TextProps } from "react-native";

export type ThemedTextProps = TextProps & {
  type?: "default" | "title" | "defaultSemiBold";
};

export function ThemedText({ type = "default", style, ...rest }: ThemedTextProps) {
  // Por enquanto ignoramos o "type" e só repassamos pro Text
  return <Text {...rest} style={style} />;
}
