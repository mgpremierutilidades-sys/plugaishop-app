import type { Payment } from "../types/order";

export function createPayment(method: Payment["method"]): Payment {
  return {
    method,
    status: "pending",
  };
}
