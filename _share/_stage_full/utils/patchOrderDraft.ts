// utils/patchOrderDraft.ts
import type { Address, OrderDraft, Payment, Shipping } from "../types/order";

export function patchOrderDraft(
  draft: OrderDraft,
  patch: Partial<Pick<OrderDraft, "address" | "payment" | "shipping" | "total" | "discount">> & {
    address?: Address;
    payment?: Payment;
    shipping?: Shipping;
  }
): OrderDraft {
  const next: OrderDraft = { ...draft, ...patch };

  const shippingPrice = next.shipping?.price ?? 0;
  const discount = next.discount ?? 0;

  // total = subtotal - desconto + frete
  next.total = next.subtotal - discount + shippingPrice;

  return next;
}
