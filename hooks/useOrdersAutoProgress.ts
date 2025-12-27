// hooks/useOrdersAutoProgress.ts
import { useEffect } from "react";

import type { Order } from "../types/order";
import { advanceMockStatus } from "../utils/orderTimelineAuto";
import { listOrders, saveOrders } from "../utils/ordersStore";

export function useOrdersAutoProgress() {
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const raw = await listOrders();

        // Normaliza tipagem para usar SEMPRE os tipos do /types
        const orders = raw as unknown as Order[];

        let changed = false;

        const nextOrders = orders.map((o) => {
          const next = advanceMockStatus(o);
          if (next.status !== o.status) changed = true;
          return next;
        });

        if (alive && changed) {
          // ordersStore pode estar tipado com "Order" próprio; mantemos compatível
          await saveOrders(nextOrders as unknown as any);
        }
      } catch {
        // silencioso: hook não pode derrubar a tela
      }
    };

    // roda uma vez ao montar
    tick();

    // e repete periodicamente (leve)
    const id = setInterval(tick, 12_000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
}

export default useOrdersAutoProgress;
