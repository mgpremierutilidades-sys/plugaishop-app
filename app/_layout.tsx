// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // mata qualquer back/ícone automático no topo
      }}
    />
  );
}
