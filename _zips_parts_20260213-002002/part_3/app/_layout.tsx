import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Chrome from "../components/global-chrome";
import { CartProvider } from "../context/CartContext";
import { DEV_FLAGS } from "../lib/flags.dev";

if (__DEV__) {
  (globalThis as any).__FLAGS__ = {
    ...(globalThis as any).__FLAGS__,
    ...DEV_FLAGS,
  };
}

export default function RootLayout() {
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="orders" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "card" }} />
          </Stack>
        </Chrome>
      </CartProvider>
    </SafeAreaProvider>
  );
}
