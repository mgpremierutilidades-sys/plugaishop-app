// types/orderStatus.ts

/**
 * Status TÉCNICO do pedido (não é label de UI).
 * UI deve usar normalizeStatusLabel(...) em utils/ordersStore.ts
 */
export type OrderStatus =
  | "created"
  | "payment_pending"
  | "processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "canceled"
  | "cancelled"
  | "custom";

export type OrderTimelineEvent = {
  status: OrderStatus;
  date: string; // ISO
  note?: string;
};
