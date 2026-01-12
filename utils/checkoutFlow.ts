import type { OrderDraft } from "../types/order";

function hasValue(v: unknown) {
  return v != null && String(v).trim().length > 0;
}

export function getCheckoutResumeHref(draft: OrderDraft | null | undefined): string | null {
  if (!draft || typeof draft !== "object") return null;

  const items = Array.isArray((draft as any).items) ? (draft as any).items : [];
  if (!items.length) return null;

  const address = (draft as any).address;
  const shipping = (draft as any).shipping;
  const payment = (draft as any).payment;

  const hasAddress =
    !!address &&
    (hasValue(address.label) ||
      hasValue(address.street) ||
      hasValue(address.city) ||
      hasValue(address.state) ||
      hasValue(address.zip));

  const hasShipping =
    !!shipping &&
    (hasValue(shipping.method) || Number.isFinite(Number(shipping.price)));

  const hasPayment =
    !!payment && hasValue(payment.method);

  if (!hasAddress) return "/(tabs)/checkout/address";
  if (!hasShipping) return "/(tabs)/checkout/shipping";
  if (!hasPayment) return "/(tabs)/checkout/payment";

  return "/(tabs)/checkout/review";
}
