import type { Href } from "expo-router";
import type { OrderDraft } from "../types/order";

export type CheckoutStep = "address" | "shipping" | "payment" | "review";

export function getNextCheckoutStep(draft: OrderDraft | null): CheckoutStep {
  if (!draft) return "address";

  const hasZip = !!draft.address?.zip && String(draft.address?.zip).length === 8;
  const hasShipping = !!draft.shipping && typeof draft.shipping.price === "number";
  const hasPayment = !!draft.payment?.method;

  if (!hasZip) return "address";
  if (!hasShipping) return "shipping";
  if (!hasPayment) return "payment";

  return "review";
}

// ✅ rotas literais (tipadas) para Expo Router
const ROUTES = {
  address: "/checkout/address",
  shipping: "/checkout/shipping",
  payment: "/checkout/payment",
  review: "/checkout/review",
} as const;

export function stepToRoute(step: CheckoutStep): Href {
  return ROUTES[step] as unknown as Href;
}
