// app/entry/index.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";

import { track } from "../../lib/analytics";
import { isFlagEnabled } from "../../constants/flags";

export default function EntryBannerScreen() {
  const router = useRouter();

  useEffect(() => {
    if (!isFlagEnabled("ff_entry_banner_splash_v1")) {
      router.replace("/(tabs)/index");
      return;
    }

    track("entry_banner_view");

    const t = setTimeout(() => {
      track("entry_banner_auto_close");
      router.replace("/(tabs)/index");
    }, 900);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.wrap}>
        {/* Substitua pelo seu banner real (asset/local/url). */}
        <View style={styles.bannerCard}>
          <Image
            source={{ uri: "https://dummyimage.com/1200x420/ffcc00/111827&text=PLUGAISHOP" }}
            resizeMode="cover"
            style={styles.bannerImg}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  bannerCard: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  bannerImg: {
    width: "100%",
    height: 220,
  },
});