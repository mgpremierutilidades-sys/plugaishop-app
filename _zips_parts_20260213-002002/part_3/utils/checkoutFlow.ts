import type { OrderDraft } from "../types/order";

export type CheckoutStep = "address" | "shipping" | "payment" | "review";

export function getNextCheckoutStep(draft: OrderDraft | null): CheckoutStep {
  if (!draft) return "address";

  const hasZip =
    !!draft.address?.zip && String(draft.address?.zip).length === 8;
  const hasShipping =
    !!draft.shipping && typeof draft.shipping.price === "number";
  const hasPayment = !!draft.payment?.method;

  if (!hasZip) return "address";
  if (!hasShipping) return "shipping";
  if (!hasPayment) return "payment";

  return "review";
}

export function stepToRoute(step: CheckoutStep): string {
  switch (step) {
    case "address":
      return "/checkout/address";
    case "shipping":
      return "/checkout/shipping";
    case "payment":
      return "/checkout/payment";
    case "review":
    default:
      return "/checkout/review";
  }
}
