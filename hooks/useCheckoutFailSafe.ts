// hooks/useCheckoutFailSafe.ts
import { router } from "expo-router";
import { useEffect } from "react";

import type { OrderDraft } from "../types/order";
import { loadOrderDraft } from "../utils/orderStorage";

type ReplaceArg = Parameters<typeof router.replace>[0];

type CheckoutStep = "address" | "shipping" | "payment" | "review";

function getNextCheckoutStep(draft: OrderDraft): CheckoutStep {
  if (!draft.address) return "address";
  if (!draft.shipping) return "shipping";
  if (!draft.payment?.method) return "payment";
  return "review";
}

function stepToRoute(step: CheckoutStep) {
  switch (step) {
    case "address":
      return "/checkout/address";
    case "shipping":
      return "/checkout/shipping";
    case "payment":
      return "/checkout/payment";
    default:
      return "/checkout/review";
  }
}

export function useCheckoutFailSafe() {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const draft = (await loadOrderDraft()) as OrderDraft | null;
        if (!alive) return;
        if (!draft) return;

        if (!Array.isArray(draft.items) || draft.items.length === 0) return;

        const step = getNextCheckoutStep(draft);
        const href = stepToRoute(step) as ReplaceArg;

        router.replace(href);
      } catch {
        // fail-safe não pode travar o app
      }
    })();

    return () => {
      alive = false;
    };
  }, []);
}
