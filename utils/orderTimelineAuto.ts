import type { Order } from "../types/order";
import type { OrderStatus } from "../types/orderStatus";

const FLOW: OrderStatus[] = [
  "payment_pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export function evolveOrderTimeline(order: Order): Order {
  const last = order.timeline[order.timeline.length - 1];
  const idx = FLOW.indexOf(last.status);

  if (idx === -1 || idx === FLOW.length - 1) {
    return order;
  }

  const nextStatus = FLOW[idx + 1];
  const now = new Date().toISOString();

  return {
    ...order,
    status: nextStatus,
    timeline: [
      ...order.timeline,
      {
        status: nextStatus,
        date: now,
      },
    ],
  };
}
