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
