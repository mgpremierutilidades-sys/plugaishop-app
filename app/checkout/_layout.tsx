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
      {/* Fluxo de checkout */}
      <Stack.Screen name="export-debug" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="pix" />
      <Stack.Screen name="review" />
      <Stack.Screen name="shipping" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
