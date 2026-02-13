import theme from "@/constants/theme";
import React from "react";
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, ViewStyle } from "react-native";

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export default function ButtonPrimary({ title, loading, disabled, style, ...rest }: Props) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.label}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
