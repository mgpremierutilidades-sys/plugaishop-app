import { router } from "expo-router";
import { useEffect } from "react";

import { getNextCheckoutStep, stepToRoute } from "../utils/checkoutFlow";
import { loadOrderDraft } from "../utils/orderStorage";

export function useCheckoutFailSafe() {
  useEffect(() => {
    (async () => {
      const draft = await loadOrderDraft();
      if (!draft) return;

      const step = getNextCheckoutStep(draft);
      const href = stepToRoute(step);

      router.replace(href);
    })();
  }, []);
}
