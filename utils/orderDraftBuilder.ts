import type { CartItem } from "../context/CartContext";
import type { OrderDraft } from "../types/order";

export function buildOrderDraft(params: {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingPrice?: number;
}) : OrderDraft {
  const total =
    params.subtotal - params.discount + (params.shippingPrice ?? 0);

  return {
    id: `OD-${Date.now()}`,
    items: params.items,
    subtotal: params.subtotal,
    discount: params.discount,
    total,
    createdAt: new Date().toISOString(),
  };
}
