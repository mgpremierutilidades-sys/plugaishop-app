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

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return (
    <Text
      {...rest}
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
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: theme.typography.bodySmall.lineHeight,
    fontWeight: "400",
  },

  bodySmall: {
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: theme.typography.bodySmall.lineHeight,
    fontWeight: "400",
  },

  defaultSemiBold: {
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: theme.typography.bodySmall.lineHeight,
    fontWeight: "500",
  },

  title: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  subtitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  sectionTitle: {
    fontSize: theme.typography.sectionTitle.fontSize,
    lineHeight: theme.typography.sectionTitle.lineHeight,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  link: {
    fontSize: theme.typography.button.fontSize,
    lineHeight: theme.typography.button.lineHeight,
    fontWeight: "600",
    color: "#0a7ea4",
  },

  caption: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "400",
  },
});
