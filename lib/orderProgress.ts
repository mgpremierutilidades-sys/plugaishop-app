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

function nowIso() {
  return new Date().toISOString();
}

export function getNextStatus(current: OrderStatus): OrderStatus {
  const idx = FLOW.indexOf(current);
  if (idx < 0) return "created";
  if (idx >= FLOW.length - 1) return current;
  return FLOW[idx + 1];
}

export function advanceOrderStatus(order: Order): Order {
  const next = getNextStatus(order.status);

  // não avança se já está no final ou cancelado
  if (
    order.status === "delivered" ||
    order.status === "canceled" ||
    order.status === "cancelled"
  ) {
    return order;
  }

  const date = nowIso();

  const timeline: OrderTimelineEvent[] = Array.isArray(order.timeline)
    ? [...order.timeline, { status: next, date }]
    : [{ status: next, date }];

  return {
    ...order,
    status: next,
    timeline,
  };
}