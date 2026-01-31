import type { Shipping } from "../types/order";

export function calculateShipping(zip?: string): Shipping {
  if (!zip) {
    return { method: "Padrão", price: 0, deadline: "A calcular" };
  }

  return {
    method: "Correios PAC",
    price: 29.9,
    deadline: "5 a 7 dias úteis",
  };
}
