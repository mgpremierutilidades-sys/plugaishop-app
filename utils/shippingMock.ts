import type { Shipping } from "../types/order";
import { isValidCEP, normalizeCEP } from "./cep";

export function calculateShipping(zip?: string): Shipping {
  const raw = zip ?? "";
  const cep8 = isValidCEP(raw) ? normalizeCEP(raw) : "";

  if (!cep8) {
    // cep8 é obrigatório no tipo Shipping → usamos string vazia quando indefinido
    return { method: "Padrão", cep8: "", price: 0, deadline: "A calcular" };
  }

  return {
    method: "Correios PAC",
    cep8,
    price: 29.9,
    deadline: "5 a 7 dias úteis",
  };
}
