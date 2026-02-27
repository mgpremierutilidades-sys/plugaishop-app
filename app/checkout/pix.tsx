import { router } from "expo-router";
import { useEffect } from "react";
import { track } from "../../lib/analytics";

export default function CheckoutPixShim() {
  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", { from: "/checkout/pix", to: "/(tabs)/checkout/payment" });
    } catch {}
    router.replace("/(tabs)/checkout/payment" as any);
  }, []);
  return null;
}