// app/_layout.tsx
import { Stack } from "expo-router";

import GlobalChrome from "../components/global-chrome";

export default function RootLayout() {
  return (
    <GlobalChrome>
      <Stack screenOptions={{ headerShown: false }} />
    </GlobalChrome>
  );
}
