import { useEffect } from "react";

import { listOrders, updateOrder } from "../utils/ordersStorage";
import { notifyIfOrderStatusChanged } from "../utils/orderNotifier";
import { advanceMockStatus } from "../utils/orderStatus";

export function useOrdersAutoProgress() {
  useEffect(() => {
    (async () => {
      const orders = await listOrders();

      for (const order of orders) {
        // Mock: avança um estágio por abertura (se quiser mais lento depois, ajustamos por tempo)
        const updated = advanceMockStatus(order);

        if (updated.status !== order.status) {
          await updateOrder(updated);
          await notifyIfOrderStatusChanged(updated);
        } else {
          // Mesmo sem avanço, garante que não vai notificar repetido
          await notifyIfOrderStatusChanged(order);
        }
      }
    })();
  }, []);
}
