import type { Shipping } from "../types/order";

function normalizeCEP(zip?: string): string {
  return zip ? String(zip).replace(/\D/g, "").slice(0, 8) : "";
}

export function calculateShipping(zip?: string): Shipping {
  const cep8 = normalizeCEP(zip);

  if (!cep8) {
    // cep8 é obrigatório no tipo Shipping (compat), então usamos string vazia
    return { method: "Padrão", cep8: "", price: 0, deadline: "A calcular" };
  }

  return {
    method: "Correios PAC",
    cep8,
    price: 29.9,
    deadline: "5 a 7 dias úteis",
  };
}
