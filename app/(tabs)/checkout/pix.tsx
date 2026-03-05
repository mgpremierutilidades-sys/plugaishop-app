import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { track } from "../../../lib/analytics";

export default function CheckoutPixShim() {
  const router = useRouter();

  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", {
        from: "/(tabs)/checkout/pix",
        to: "/(tabs)/checkout/payment",
      });
    } catch {}

    router.replace("/(tabs)/checkout/payment");
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: "PIX", headerShown: false }} />
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});