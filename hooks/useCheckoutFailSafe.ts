// hooks/useCheckoutFailSafe.ts
import { router, type Href } from "expo-router";
import { useEffect } from "react";

import type { OrderDraft } from "../types/order";
import { loadOrderDraft } from "../utils/orderStorage";

/**
 * Fail-safe: se existir draft pendente, retoma automaticamente no passo certo.
 * Usado na Home para não perder checkout se o usuário saiu no meio.
 */
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

        // Descobre o próximo passo faltante
        const href: Href =
          !draft.address
            ? "/checkout/address"
            : !draft.shipping
            ? "/checkout/shipping"
            : !draft.payment
            ? "/checkout/payment"
            : "/checkout/review";

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

