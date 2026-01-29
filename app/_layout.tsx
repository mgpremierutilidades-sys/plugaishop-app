import { Stack } from "expo-router";

import theme from "../constants/theme";
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
          // Fundo sólido para estabilidade visual em transições/modals (não altera layout)
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </CartProvider>
  );
}
