import { router } from "expo-router";
import { useEffect } from "react";
import { track } from "../../lib/analytics";

export default function CheckoutShippingShim() {
  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", {
        from: "/checkout/shipping",
        to: "/(tabs)/checkout/shipping",
      });
    } catch {}
    router.replace("/(tabs)/checkout/shipping" as any);
  }, []);

  return null;
}