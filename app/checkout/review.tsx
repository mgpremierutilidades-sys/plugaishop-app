import { router } from "expo-router";
import { useEffect } from "react";
import { track } from "../../lib/analytics";

export default function CheckoutReviewShim() {
  useEffect(() => {
    try {
      track("checkout_route_shim_redirect", { from: "/checkout/review", to: "/(tabs)/checkout/review" });
    } catch {}
    router.replace("/(tabs)/checkout/review" as any);
  }, []);
  return null;
}