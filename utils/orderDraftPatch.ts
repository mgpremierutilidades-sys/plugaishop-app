import type { OrderDraft, Address, Payment, Shipping } from "../types/order";

export function patchOrderDraft(
  draft: OrderDraft,
  patch: Partial<Pick<OrderDraft, "address" | "payment" | "shipping" | "total">> & {
    address?: Address;
    payment?: Payment;
    shipping?: Shipping;
  }
): OrderDraft {
  const next: OrderDraft = { ...draft, ...patch };

  // Recalcula total quando shipping muda
  const shippingPrice = next.shipping?.price ?? 0;
  next.total = next.subtotal - next.discount + shippingPrice;

  return next;
}
