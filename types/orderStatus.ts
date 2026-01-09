// types/orderStatus.ts
export const ORDER_STATUSES = [
  "created",
  "payment_pending",
  "processing",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "canceled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderTimelineEvent = {
  status: OrderStatus;
  date: string; // ISO
  note?: string;
};
