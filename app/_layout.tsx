import { Stack } from "expo-router";
import { useEffect } from "react";

import theme from "../constants/theme";
import { CartProvider } from "../context/CartContext";
import { initAnalytics, trackTimeToInteractive } from "../utils/analytics";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  useEffect(() => {
    // Inicializa analytics (flag OFF por padrão, então é no-op de fato)
    void initAnalytics().then(() => {
      // Sem impacto visual: apenas métrica, se flag estiver ON
      trackTimeToInteractive("app_root");
    });
  }, []);

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
