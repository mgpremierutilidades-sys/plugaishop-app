// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";

// Mantém compatibilidade com ErrorBoundary do Expo Router (opcional, mas seguro)
export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  useEffect(() => {
    // Ignore APENAS ruídos conhecidos (não mascara travamentos reais)
    LogBox.ignoreLogs([
      "expo-notifications:",
      "`expo-notifications` functionality is not fully supported in Expo Go",
      '[Layout children]: No route named',
      '"chevron-forward" is not a valid icon name',
      '"chevron.right" is not a valid icon name',
      "SafeAreaView has been deprecated",
    ]);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* Rotas reais de topo */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />

      {/* Modal (se existir app/modal.tsx) */}
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
