import { useEffect } from "react";

import type { Order } from "../types/order";
import type { OrderStatus } from "../types/orderStatus";
import { notifyIfOrderStatusChanged } from "../utils/orderNotifier";
import { listOrders, updateOrder } from "../utils/ordersStorage";
import { advanceMockStatus } from "../utils/orderStatus";

export function useOrdersAutoProgress() {
  useEffect(() => {
    (async () => {
      const orders = await listOrders();

      for (const order of orders) {
        const nextStatus: OrderStatus = advanceMockStatus(order.status);

        if (nextStatus !== order.status) {
          const updated: Order = {
            ...order,
            status: nextStatus,
            timeline: [
              ...(order.timeline ?? []),
              { status: nextStatus, date: new Date().toISOString() },
            ],
          };

          await updateOrder(updated);
          await notifyIfOrderStatusChanged(updated);
        } else {
          await notifyIfOrderStatusChanged(order);
        }
      }
    })();
  }, []);
}
