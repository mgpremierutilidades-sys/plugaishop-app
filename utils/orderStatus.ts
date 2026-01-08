// utils/orderStatus.ts
import type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";

export function getInitialStatus(): OrderStatus {
  return "created";
}

export function buildInitialTimeline(createdAtIso: string): OrderTimelineEvent[] {
  return [{ status: "created", date: createdAtIso }];
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "canceled";
}
