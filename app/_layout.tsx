// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";

export { ErrorBoundary } from "expo-router";

import GlobalChrome from "../components/global-chrome";

export default function RootLayout() {
  useEffect(() => {
    LogBox.ignoreLogs([
      "expo-notifications:",
      "`expo-notifications` functionality is not fully supported in Expo Go",
      "[Layout children]: No route named",
      '"chevron-forward" is not a valid icon name',
      '"chevron.right" is not a valid icon name',
      "SafeAreaView has been deprecated",
    ]);
  }, []);

  return (
    <GlobalChrome>
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
    </GlobalChrome>
  );
}
