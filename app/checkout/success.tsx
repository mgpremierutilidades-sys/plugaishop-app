import { router } from "expo-router";
import { useEffect } from "react";
import { track } from "../../lib/analytics";

export default function CheckoutSuccessShim() {
  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", {
        from: "/checkout/success",
        to: "/(tabs)/checkout/success",
      });
    } catch {}
    router.replace("/(tabs)/checkout/success" as any);
  }, []);

  return null;
}