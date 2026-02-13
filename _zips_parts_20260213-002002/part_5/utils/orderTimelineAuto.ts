// utils/orderTimelineAuto.ts
import type { Order } from "../types/order";
import type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";

const FLOW: OrderStatus[] = [
  "created",
  "payment_pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export function advanceMockStatus(order: Order): Order {
  if (order.status === "delivered" || order.status === "canceled") {
    return order;
  }

  const idx = FLOW.indexOf(order.status);
  if (idx < 0) return order;

  const nextStatus = FLOW[idx + 1];
  if (!nextStatus) return order;

  const now = new Date().toISOString();
  const timeline = Array.isArray((order as any).timeline)
    ? (order as any).timeline
    : [];

  return {
    ...order,
    status: nextStatus,
    timeline: [
      ...timeline,
      {
        status: nextStatus,
        date: now,
      } as OrderTimelineEvent,
    ],
  };
}
