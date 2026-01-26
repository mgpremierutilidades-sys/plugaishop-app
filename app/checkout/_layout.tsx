// app/checkout/_layout.tsx
import { Stack } from "expo-router";

import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function CheckoutLayout() {
  // Retoma a etapa correta (address/shipping/payment/review) baseado no draft salvo.
  useCheckoutFailSafe();

  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
