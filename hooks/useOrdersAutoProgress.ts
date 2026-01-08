// hooks/useOrdersAutoProgress.ts
import { useEffect } from "react";

import { advanceOrderStatus, ensureOrdersHydrated, listOrders } from "../utils/ordersStore";

export function useOrdersAutoProgress(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    (async () => {
      await ensureOrdersHydrated();

      const orders = await listOrders();
      if (!alive) return;

      if (orders.length > 0) {
        const id = String((orders[0] as any).id ?? "");
        if (id) await advanceOrderStatus(id);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled]);
}

export default useOrdersAutoProgress;
