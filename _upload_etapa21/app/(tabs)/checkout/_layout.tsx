// app/(tabs)/checkout/_layout.tsx
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function CheckoutLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
