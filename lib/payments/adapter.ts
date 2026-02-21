import type { PaymentMethod, PaymentSelection } from "../../types/payment";

/**
 * payment_adapter_v1 (mock):
 * - returns a selection object; wiring to storage happens in UI layer.
 */
export function selectPaymentMethod(method: PaymentMethod): PaymentSelection {
  return {
    method,
    selectedAtUtc: new Date().toISOString(),
  };
}