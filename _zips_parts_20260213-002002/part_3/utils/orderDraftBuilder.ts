// utils/orderDraftBuilder.ts
import type { Address, OrderDraft, Payment, Shipping } from "../types/order";

type BuildDraftParams = {
  id: string;
  items: OrderDraft["items"];
  subtotal: number;
  discount?: number;
  shipping?: Shipping;
  address?: Address;
  payment?: Payment;
  note?: string;
};

export function buildOrderDraft(params: BuildDraftParams): OrderDraft {
  const shippingPrice = params.shipping?.price ?? 0;
  const discount = params.discount ?? 0;

  return {
    id: params.id,
    items: params.items,
    subtotal: params.subtotal,
    discount,
    shipping: params.shipping,
    address: params.address,
    payment: params.payment,
    note: params.note,
    total: params.subtotal - discount + shippingPrice,
  };
}
