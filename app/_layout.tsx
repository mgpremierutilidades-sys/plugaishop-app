import { Stack } from "expo-router";
import { useEffect } from "react";

import theme from "../constants/theme";
import { CartProvider } from "../context/CartContext";
import { FeatureFlags, getFeatureFlag } from "../constants/featureFlags";
import { initAnalytics, trackTimeToInteractive } from "../utils/analytics";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  useEffect(() => {
    // Inicializa analytics (flag OFF por padrão, então é no-op de fato)
    void initAnalytics().then(() => {
      // Sem impacto visual: apenas métrica, se flags estiverem ON
      void getFeatureFlag(FeatureFlags.TTI_V1).then((ttiEnabled) => {
        if (ttiEnabled) trackTimeToInteractive("app_root");
      });
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
