// app/auth/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        animation: Platform.select({
          ios: "slide_from_right",
          android: "slide_from_right",
          default: "default",
        }),
      }}
    >
      <Stack.Screen
        name="login"
        options={{ title: "Entrar na Plugaí Shop" }}
      />
      <Stack.Screen
        name="register"
        options={{ title: "Criar conta" }}
      />
    </Stack>
  );
}
