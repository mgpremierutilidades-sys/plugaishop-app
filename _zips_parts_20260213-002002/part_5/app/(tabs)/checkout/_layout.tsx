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
    />
  );
}
