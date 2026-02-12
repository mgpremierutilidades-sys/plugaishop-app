import { Stack } from "expo-router";

import Chrome from "../components/global-chrome";
import { CartProvider } from "../context/CartContext";
import { DEV_FLAGS } from "../lib/flags.dev";

if (__DEV__) {
  (globalThis as any).__FLAGS__ = { ...(globalThis as any).__FLAGS__, ...DEV_FLAGS };
}

export default function RootLayout() {
  return (
    <CartProvider>
      <Chrome>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="orders" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </Chrome>
    </CartProvider>
  );
}
