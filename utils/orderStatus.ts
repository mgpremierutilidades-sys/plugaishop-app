import type { OrderDraft, Order } from "../types/order";
import type { OrderTimelineEvent } from "../types/orderStatus";

export function createInitialOrderFromDraft(draft: OrderDraft): Order {
  const now = new Date().toISOString();

  const timeline: OrderTimelineEvent[] = [
    {
      status: "created",
      date: now,
    },
    {
      status: draft.payment?.method ? "payment_pending" : "created",
      date: now,
    },
  ];

  return {
    ...draft,
    status: draft.payment?.status === "paid" ? "paid" : "payment_pending",
    timeline,
    createdAt: now,
  };
}
