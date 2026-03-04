// app/_layout.tsx
import { Stack, usePathname, useSegments } from "expo-router";
import { useLayoutEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Chrome from "../components/global-chrome";
import { CartProvider } from "../context/CartContext";
import { DEV_FLAGS } from "../lib/flags.dev";
import { setActiveScreenName } from "../lib/nav";

if (__DEV__) {
  (globalThis as any).__FLAGS__ = {
    ...(globalThis as any).__FLAGS__,
    ...DEV_FLAGS,
  };
}

export default function RootLayout() {
  const pathname = usePathname();
  const segments = useSegments();

  useLayoutEffect(() => {
    // Prefer segments because pathname can be "(tabs)" on some transitions
    const s = segments?.length ? segments.join("/") : "";
    const p = (pathname ?? "").replace(/^\//, "").trim(); // "/(tabs)/index" -> "(tabs)/index"

    const name =
      s && s !== "(tabs)" ? s : p && p !== "(tabs)" ? p : "root";

    setActiveScreenName(name);
  }, [pathname, segments]);

  return (
    <SafeAreaProvider>
      <CartProvider>
        <Chrome>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#F5F7FA" },
              animation: "slide_from_right",
            }}
          >
            {/* As rotas existem como entry/index e entry/splash */}
            <Stack.Screen name="entry/index" options={{ headerShown: false }} />
            <Stack.Screen name="entry/splash" options={{ headerShown: false }} />

            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="orders" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "card" }} />
          </Stack>
        </Chrome>
      </CartProvider>
    </SafeAreaProvider>
  );
}