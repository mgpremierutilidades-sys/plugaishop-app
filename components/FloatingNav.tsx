import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import IconSymbol from "./ui/icon-symbol";
import theme from "../constants/theme";

export default function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Opcional: esconder em telas de autenticação (ajuste se quiser)
  const hideOn =
    pathname?.startsWith("/auth") || pathname?.startsWith("/modal");

  if (hideOn) return null;

  const goHome = () => {
    // Home (tabs index) no Expo Router normalmente é "/"
    router.push("/");
  };

  const goBack = () => {
    // back() é seguro; se não tiver histórico, cai no home
    try {
      router.back();
    } catch {
      goHome();
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
          right: 12,
        },
      ]}
    >
      <View style={styles.container}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          hitSlop={10}
        >
          <IconSymbol
            name="arrow-back-outline"
            color={theme.colors.textPrimary}
            size={20}
          />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={goHome}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          hitSlop={10}
        >
          <IconSymbol
            name="home-outline"
            color={theme.colors.textPrimary}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    zIndex: 9999,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: theme.colors.divider,
  },
});
