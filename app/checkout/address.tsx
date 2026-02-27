import { router } from "expo-router";
import { useEffect } from "react";
import { track } from "../../lib/analytics";

export default function CheckoutAddressShim() {
  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", { from: "/checkout/address", to: "/(tabs)/checkout/address" });
    } catch {}
    router.replace("/(tabs)/checkout/address" as any);
  }, []);
  return null;
}