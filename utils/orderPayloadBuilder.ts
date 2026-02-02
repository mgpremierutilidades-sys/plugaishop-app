import type { Order } from "../types/order";
import type { LineItemPayload, OrderPayload, PaymentPayload } from "../types/orderPayload";

function safeNumber(n: unknown, fallback = 0) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

export function buildOrderPayload(order: Order): OrderPayload {
  const items: LineItemPayload[] = order.items.map((it: any) => ({
    productId: String(it.id),
    title: String(it.title ?? "Produto"),
    quantity: Math.max(1, Math.floor(safeNumber(it.qty ?? 1))),
    unitPrice: safeNumber(it.price ?? 0),
    discount: safeNumber(it.discountPercent ? (safeNumber(it.price ?? 0) * safeNumber(it.discountPercent) / 100) : 0),
  }));

  const subtotal = safeNumber(order.subtotal ?? 0);
  const discount = safeNumber(order.discount ?? 0);
  const total = safeNumber(order.total ?? Math.max(0, subtotal - discount));

  const shippingPrice = safeNumber(order.shipping?.price ?? 0);
  const shipping = {
    method: String(order.shipping?.method ?? "delivery"),
    price: shippingPrice,
    deadline: String(order.shipping?.deadline ?? ""),
  };

  const payment: PaymentPayload | undefined = order.payment
    ? {
        method: order.payment.method === "card" ? "card" : order.payment.method === "boleto" ? "boleto" : "pix",
        status: (order.payment.status as PaymentPayload["status"]) ?? "pending",
      }
    : undefined;

  return {
    source: "plugaishop-app",
    orderId: String(order.id),
    createdAt: String(order.createdAt),

    items,

    subtotal,
    discount,
    shipping,
    total,

    payment,

    rawOrder: order,
  };
}
