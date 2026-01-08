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

function nextInFlow(current: OrderStatus): OrderStatus {
  const idx = FLOW.indexOf(current);
  if (idx < 0) return "created";
  if (idx >= FLOW.length - 1) return "delivered";
  return FLOW[idx + 1];
}

export function applyAutoTimelineStep(order: Order): Order {
  const current = (order.status ?? "created") as OrderStatus;

  if (current === "delivered" || current === "canceled") return order;

  const next = nextInFlow(current);
  const date = new Date().toISOString();

  const timeline: OrderTimelineEvent[] = Array.isArray(order.timeline)
    ? [...order.timeline, { status: next, date }]
    : [{ status: "created", date: order.createdAt ?? date }, { status: next, date }];

  const statusHistory = Array.isArray(order.statusHistory)
    ? [...order.statusHistory, { status: next, at: date }]
    : [{ status: next, at: date }];

  return {
    ...order,
    status: next,
    timeline,
    statusHistory,
  };
}

// Alias para compatibilidade com o hook existente
export const advanceMockStatus = applyAutoTimelineStep;
