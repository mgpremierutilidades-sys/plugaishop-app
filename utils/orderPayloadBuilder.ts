import type { Order } from "../types/order";
import type { OrderPayload, LineItemPayload } from "../types/orderPayload";

function safeNumber(n: unknown, fallback = 0) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return v;
}

export function buildOrderPayload(order: Order): OrderPayload {
  const items: LineItemPayload[] = order.items.map((it) => ({
    sku: (it as any).sku ?? (it as any).id ?? undefined,
    productId: (it as any).id ?? undefined,
    title: (it as any).title ?? (it as any).name ?? "Item",
    quantity: safeNumber((it as any).qty ?? (it as any).quantity ?? 1, 1),
    unitPrice: safeNumber((it as any).price ?? (it as any).unitPrice ?? 0, 0),
    discount: safeNumber((it as any).discount ?? 0, 0),
  }));

  const shippingPrice = safeNumber(order.shipping?.price ?? 0, 0);

  return {
    source: "plugaishop-app",
    orderId: order.id,
    createdAt: order.createdAt,

    customer: undefined, // pronto para plugar depois (login/cadastro)
    address: {
      zip: order.address?.zip,
      street: order.address?.street,
      number: order.address?.number,
      city: order.address?.city,
      state: order.address?.state,
      complement: undefined,
    },

    items,

    subtotal: safeNumber(order.subtotal, 0),
    discount: safeNumber(order.discount, 0),
    shipping: {
      method: order.shipping?.method,
      price: shippingPrice,
      deadline: order.shipping?.deadline,
    },
    total: safeNumber(order.total, 0),

    payment: order.payment
      ? { method: order.payment.method, status: order.payment.status }
      : undefined,

    rawOrder: order,
  };
}
