import { router, useSegments } from "expo-router";
import { useEffect, useRef } from "react";

import { loadOrderDraft } from "../utils/orderStorage";
import { getCheckoutResumeHref } from "../utils/checkoutFlow";

export function useCheckoutFailSafe() {
  // FIX TS: evita inferência "never[]"
  const segments = useSegments() as string[];
  const ranRef = useRef(false);

  useEffect(() => {
    // IMPORTANTÍSSIMO:
    // Este failsafe NÃO pode rodar fora do fluxo de checkout, senão ele “puxa” o app para /address no boot.
    const inCheckout = segments.includes("checkout");
    if (!inCheckout) return;

    if (ranRef.current) return;
    ranRef.current = true;

    let alive = true;

    (async () => {
      try {
        const draft = await loadOrderDraft();
        const href = getCheckoutResumeHref(draft);

        if (!alive) return;

        // Se existir um “ponto de retomada”, garante que estamos na etapa certa.
        if (href) router.replace(href as any);
      } catch {
        // silencioso para não travar o app
      }
    })();

    return () => {
      alive = false;
    };
  }, [segments]);
}
