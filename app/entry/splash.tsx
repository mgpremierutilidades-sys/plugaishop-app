// app/entry/splash.tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { track } from "../../lib/analytics";

export default function EntrySplashScreen() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    try {
      track("entry_banner_view");
    } catch {}

    const t = setTimeout(() => {
      try {
        track("entry_banner_auto_close");
      } catch {}
      router.replace("/(tabs)/index");
    }, 900);

    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bannerWrap}>
        <Image
          source={require("../../assets/banners/banner-home.png")}
          resizeMode="cover"
          style={styles.banner}
          accessibilityLabel="Banner de entrada"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  bannerWrap: {
    margin: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  banner: { width: "100%", height: "100%" },
});