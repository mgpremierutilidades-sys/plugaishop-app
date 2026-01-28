import React from "react";
import { Stack } from "expo-router";

export default function DebugLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
      }}
    >
      {/* Telas de debug */}
      <Stack.Screen name="outbox" />
    </Stack>
  );
}
