// components/Toast.tsx
import { memo, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import theme from "../constants/theme";
import { ThemedText } from "./themed-text";

type Props = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  bottomOffset?: number;
};

const Toast = memo(function Toast({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  bottomOffset = 24,
}: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(a, {
      toValue: visible ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [a, visible]);

  if (!visible) return null;

  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
      <Animated.View style={[styles.card, { opacity: a, transform: [{ translateY }] }]}>
        <ThemedText style={styles.msg} numberOfLines={2} ellipsizeMode="tail">
          {message}
        </ThemedText>

        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={styles.actionBtn} hitSlop={10} accessibilityRole="button">
            <ThemedText style={styles.actionText}>{actionLabel}</ThemedText>
          </Pressable>
        ) : null}

        <Pressable onPress={onDismiss} style={styles.dismissBtn} hitSlop={10} accessibilityRole="button">
          <ThemedText style={styles.dismissText}>×</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
});

export default Toast;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  msg: { flex: 1, color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  actionText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  dismissText: { color: theme.colors.muted, fontSize: 18, lineHeight: 18, fontWeight: "700" },
});
