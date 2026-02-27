import { router } from "expo-router";
import { useEffect } from "react";
import { track } from "../../lib/analytics";

export default function CheckoutIndexShim() {
  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", { from: "/checkout", to: "/(tabs)/checkout" });
    } catch {}
    router.replace("/(tabs)/checkout" as any);
  }, []);

  return null;
}