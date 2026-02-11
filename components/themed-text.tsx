// components/themed-text.tsx
import { StyleSheet, Text, type TextProps } from "react-native";

import theme from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedTextType =
  | "default"
  | "title"
  | "defaultSemiBold"
  | "subtitle"
  | "link"
  | "caption"
  | "bodySmall"
  | "sectionTitle";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextType;
};

/**
 * Tipografia global “compact + fina” + PADRÃO SEM "..."
 * Regra:
 * - Se vier numberOfLines e NÃO vier ellipsizeMode, usamos "clip"
 *   (corta sem reticências) para evitar os “três pontinhos”.
 */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ellipsizeMode,
  numberOfLines,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  const resolvedEllipsizeMode =
    ellipsizeMode ?? (typeof numberOfLines === "number" ? "clip" : undefined);

  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines}
      ellipsizeMode={resolvedEllipsizeMode}
      style={[{ color }, styles.common, typeStyles[type], style]}
    />
  );
}

const styles = StyleSheet.create({
  common: {
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

const typeStyles = StyleSheet.create({
  default: {
    fontSize: theme.typography.bodySmall.fontSize, // 14
    lineHeight: theme.typography.bodySmall.lineHeight, // 20
    fontWeight: "400",
  },

  defaultSemiBold: {
    fontSize: theme.typography.bodySmall.fontSize, // 14
    lineHeight: theme.typography.bodySmall.lineHeight, // 20
    fontWeight: "500",
  },

  title: {
    fontSize: theme.typography.h2.fontSize, // 22
    lineHeight: theme.typography.h2.lineHeight, // 28
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  subtitle: {
    fontSize: theme.typography.h3.fontSize, // 18
    lineHeight: theme.typography.h3.lineHeight, // 24
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  link: {
    fontSize: theme.typography.button.fontSize, // 14
    lineHeight: theme.typography.button.lineHeight, // 18
    fontWeight: "600",
    color: "#0a7ea4",
  },

  caption: {
    fontSize: theme.typography.caption.fontSize, // 12
    lineHeight: theme.typography.caption.lineHeight, // 16
    fontWeight: "400",
  },

  bodySmall: {
    fontSize: theme.typography.bodySmall.fontSize, // 14
    lineHeight: theme.typography.bodySmall.lineHeight, // 20
    fontWeight: "400",
  },

  sectionTitle: {
    fontSize: theme.typography.sectionTitle.fontSize, // 14
    lineHeight: theme.typography.sectionTitle.lineHeight, // 18
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});
