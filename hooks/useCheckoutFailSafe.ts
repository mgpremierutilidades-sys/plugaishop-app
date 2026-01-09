// hooks/useCheckoutFailSafe.ts
import { router } from "expo-router";
import { useEffect } from "react";

import type { OrderDraft } from "../types/order";
import { loadOrderDraft } from "../utils/orderStorage";

type ReplaceArg = Parameters<typeof router.replace>[0];

export function useCheckoutFailSafe() {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const draft = (await loadOrderDraft()) as OrderDraft | null;
        if (!alive) return;
        if (!draft) return;

        // Se não tem itens, não faz nada (evita prender usuário no checkout)
        if (!Array.isArray(draft.items) || draft.items.length === 0) return;

      const step = getNextCheckoutStep(draft);

      // Força o TypeScript a tratar como rota válida para o Expo Router
      const href = stepToRoute(step) as ReplaceArg;

        router.replace(href);
      } catch {
        // silencioso: fail-safe não pode travar o app
      }
    })();

    return () => {
      alive = false;
    };
  }, []);
}

