// components/AppHeader.tsx
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import theme from "../constants/theme";
import { ThemedText } from "./themed-text";

export const HEADER_HEIGHT = 64;

type AppHeaderProps = {
  title: string;
  subtitle?: string;

  /** Padrão do app: showBack (mais simples nas telas) */
  showBack?: boolean;

  /** Opcional: se quiser override do back */
  onBack?: (() => void) | null;

  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export function AppHeader({
  title,
  subtitle,
  showBack,
  onBack,
  leftSlot,
  rightSlot,
}: AppHeaderProps) {
  const canBack = !!showBack || !!onBack;

  function handleBack() {
    if (onBack) return onBack();
    // fallback padrão (expo-router)
    try {
      router.back();
    } catch {
      // no-op
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        <View style={styles.left}>
          {canBack ? (
            <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
              <ThemedText type="defaultSemiBold" style={styles.backText}>
                {"←"}
              </ThemedText>
            </Pressable>
          ) : null}

          {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
        </View>

        <View style={styles.center}>
          <ThemedText type="title" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>

          {subtitle ? (
            <ThemedText type="caption" numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.right}>{rightSlot ? rightSlot : null}</View>
      </View>

      <View style={styles.divider} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.background,
  },
  bar: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
  },

  left: { minWidth: 64, flexDirection: "row", alignItems: "center", gap: 8 },
  leftSlot: { alignItems: "center", justifyContent: "center" },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  backText: { fontSize: 16 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2, // ajuda a evitar “corte” visual em iOS
    paddingBottom: 2,
  },
  title: {
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },

  right: { minWidth: 64, alignItems: "flex-end", justifyContent: "center" },
});
