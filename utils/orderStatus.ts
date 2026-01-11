// utils/orderStatus.ts
import type { Order, OrderDraft } from "../types/order";
import type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";

function uid(prefix = "order") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function createInitialOrderFromDraft(draft: OrderDraft): Order {
  const now = new Date().toISOString();

  const status: OrderStatus =
    draft.payment?.status === "paid" ? "paid" : "payment_pending";

  const timeline: OrderTimelineEvent[] = [
    { status: "created", date: now },
    { status, date: now },
  ];

  return {
    ...(draft as any),
    id: String(draft.id ?? uid("order")),
    status,
    timeline,
    createdAt: now,
  } as Order;
}

export function advanceMockStatus(current: OrderStatus): OrderStatus {
  const flow: OrderStatus[] = [
    "created",
    "payment_pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
  ];

  const idx = flow.indexOf(current);
  if (idx < 0) return "created";
  if (idx >= flow.length - 1) return flow[flow.length - 1];
  return flow[idx + 1];
}
