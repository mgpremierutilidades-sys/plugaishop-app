// utils/orderStatus.ts
import type { Order, OrderDraft } from "../types/order";
import type { OrderTimelineEvent } from "../types/orderStatus";

export function createInitialOrderFromDraft(draft: OrderDraft): Order {
  const now = new Date().toISOString();

  const status =
    draft.payment?.status === "paid" ? "paid" : "payment_pending";

  const timeline: OrderTimelineEvent[] = [
    { status: "created", date: now },
    { status, date: now },
  ];

  return {
    ...(draft as any),
    status,
    timeline,
    createdAt: now,
  };
}

/**
 * Avança o status do pedido para simulação (mock).
 * Usado pelo auto-progress do app.
 */
export function advanceMockStatus(current: OrderStatus): OrderStatus {
  const flow: OrderStatus[] = [
    "created",
    "payment_pending",
    "paid",
    "shipped",
    "delivered",
  ];

  const idx = flow.indexOf(current);
  if (idx < 0) return "created";
  if (idx >= flow.length - 1) return flow[flow.length - 1];
  return flow[idx + 1];
}
