// app/checkout/_layout.tsx
import { Stack } from "expo-router";

import GlobalChromeDefault from "../../components/global-chrome";

export default function CheckoutLayout() {
  return (
    <GlobalChromeDefault>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </GlobalChromeDefault>
  );
}
