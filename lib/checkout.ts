import { router } from "expo-router";
import { isFlagEnabled } from "../constants/flags";
import { track } from "./analytics";

export type CheckoutStartPayload = {
  source: "cart" | "pdp" | "home" | "unknown";
  subtotal?: number;
  items_count?: number;
};

export function startCheckout(payload: CheckoutStartPayload) {
  if (!isFlagEnabled("ff_checkout_start_guardrails_v1")) {
    try {
      router.push("/checkout" as any);
    } catch {
      try {
        router.push("/(tabs)/checkout" as any);
      } catch {}
    }
    return;
  }

  if (isFlagEnabled("ff_cart_analytics_v1")) {
    track("checkout_start", {
      source: payload.source ?? "unknown",
      subtotal: Number(payload.subtotal ?? 0),
      items_count: Number(payload.items_count ?? 0),
    });
  }

  try {
    router.push("/checkout" as any);
  } catch {
    try {
      router.push("/(tabs)/checkout" as any);
    } catch {}
  }
}