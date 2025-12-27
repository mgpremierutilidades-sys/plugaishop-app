// types/orderStatus.ts

export type OrderStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "canceled";

export type OrderTimelineEvent = {
  status: OrderStatus;
  date: string;
};
