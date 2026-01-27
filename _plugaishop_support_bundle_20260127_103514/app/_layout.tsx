import { Stack } from "expo-router";

import { CartProvider } from "../context/CartContext";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerShown: false,
        }}
      />
    </CartProvider>
  );
}
