// utils/orderTimelineAuto.ts
import type { Order } from "../types/order";
import type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";
import { advanceMockStatus } from "./orderStatus";

export function computeNextTimelineEvent(order: Order): OrderTimelineEvent | null {
  const timeline = order.timeline ?? [];
  const last = timeline[timeline.length - 1];

  const currentStatus: OrderStatus = last?.status ?? order.status ?? "created";
  const nextStatus = advanceMockStatus(currentStatus);

  if (nextStatus === currentStatus) return null;

  return {
    status: nextStatus,
    date: new Date().toISOString(),
  };
}

export function applyAutoTimelineProgress(order: Order): Order {
  const next = computeNextTimelineEvent(order);
  if (!next) return order;

  return {
    ...order,
    status: next.status,
    timeline: [...(order.timeline ?? []), next],
  };
}
