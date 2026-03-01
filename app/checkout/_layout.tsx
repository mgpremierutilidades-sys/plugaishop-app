// app/checkout/_layout.tsx
import { Stack } from "expo-router";

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F7FA" },
        animation: "slide_from_right",
      }}
    >
      {/* Fluxo de checkout */}
      <Stack.Screen name="index" />
      <Stack.Screen name="address" />
      <Stack.Screen name="shipping" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="pix" />
      <Stack.Screen name="review" />
      <Stack.Screen name="success" />
    </Stack>
  );
}