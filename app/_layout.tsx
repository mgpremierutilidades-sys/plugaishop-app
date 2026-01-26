import { Stack, router, useSegments } from "expo-router";
import { useEffect, useRef } from "react";

import { CartProvider } from "../context/CartContext";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  // FIX TS: evita inferência "never[]"
  const segments = useSegments() as string[];
  const handledRef = useRef(false);

  useEffect(() => {
    // espera router “acordar”
    if (!segments || segments.length === 0) return;
    if (handledRef.current) return;

    const inCheckout = segments.includes("checkout");

    // Se o app abriu direto em qualquer tela do checkout (por restore/deep link),
    // força voltar para a home das tabs UMA VEZ.
    if (inCheckout) {
      handledRef.current = true;
      router.replace("/(tabs)" as any);
      return;
    }

    handledRef.current = true;
  }, [segments]);

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
