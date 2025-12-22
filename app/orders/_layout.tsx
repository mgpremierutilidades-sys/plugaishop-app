import React from "react";
import { Stack } from "expo-router";

export default function OrdersStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/support" />
      <Stack.Screen name="[id]/invoice" />
      <Stack.Screen name="[id]/review" />
      <Stack.Screen name="[id]/return" />
      <Stack.Screen name="[id]/tracking" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
