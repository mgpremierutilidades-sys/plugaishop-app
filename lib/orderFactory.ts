import type { Order, OrderDraft } from "../types/order";
import type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";

function makeId(prefix = "ord") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function makeEvent(status: OrderStatus, date: string): OrderTimelineEvent {
  return { status, date };
}

export function buildOrderFromDraft(draft: OrderDraft): Order {
  const createdAt = new Date().toISOString();

  const subtotal = toNumber(draft.subtotal, 0);
  const discount = toNumber(draft.discount ?? 0, 0);
  const shippingPrice = toNumber(draft.shipping?.price ?? 0, 0);

  const computedTotal = Math.max(0, subtotal - discount + shippingPrice);
  const total = Number.isFinite(draft.total) ? draft.total : computedTotal;

  const id = draft.id && String(draft.id).trim() ? String(draft.id) : makeId();

  const paymentStatus: OrderStatus =
    draft.payment?.status === "paid" ? "paid" : "payment_pending";

  const timeline: OrderTimelineEvent[] = [
    makeEvent("created", createdAt),
    makeEvent(paymentStatus, createdAt),
  ];

  // Status inicial do Order
  const status: OrderStatus = paymentStatus === "paid" ? "paid" : "created";

  return {
    ...draft,
    id,
    subtotal,
    discount,
    total,
    status,
    timeline,
    createdAt,
  };
}