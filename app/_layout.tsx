// app/_layout.tsx
import { Stack } from "expo-router";

import GlobalChromeDefault from "../components/global-chrome";

export default function RootLayout() {
  return (
    <GlobalChromeDefault>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </GlobalChromeDefault>
  );
}
