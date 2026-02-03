import React from "react";
import { Stack } from "expo-router";

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* Mantido apenas o que realmente existe em app/checkout para evitar rotas órfãs */}
      <Stack.Screen name="export-debug" />
      <Stack.Screen name="pix" />
    </Stack>
  );
}
