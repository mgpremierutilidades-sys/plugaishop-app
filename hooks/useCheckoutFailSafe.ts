// hooks/useCheckoutFailSafe.ts
import { router } from "expo-router";
import { useEffect } from "react";

import { getNextCheckoutStep, stepToRoute } from "../utils/checkoutFlow";
import { loadOrderDraft } from "../utils/orderStorage";

type ReplaceArg = Parameters<typeof router.replace>[0];

export function useCheckoutFailSafe() {
  useEffect(() => {
    (async () => {
      const draft = await loadOrderDraft();
      if (!draft) return;

      const step = getNextCheckoutStep(draft);

      // Força o TypeScript a tratar como rota válida para o Expo Router
      const href = stepToRoute(step) as ReplaceArg;

      router.replace(href);
    })();
  }, []);
}
