// app/account/_layout.tsx
import { Stack } from "expo-router";

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="profile"
        options={{ title: "Meus dados" }}
      />
      <Stack.Screen
        name="addresses"
        options={{ title: "Meus endereços" }}
      />
      <Stack.Screen
        name="help"
        options={{ title: "Ajuda" }}
      />
    </Stack>
  );
}
