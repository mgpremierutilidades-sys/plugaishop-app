import type { Shipping } from "../types/order";
import { isValidCEP, normalizeCEP } from "./cep";

export type ShippingOption = Shipping & {
  id: "pac" | "sedex" | "express";
};

function baseByRegion(cep8: string): number {
  // mock simples por região (prefixo)
  const prefix = Number(cep8.slice(0, 2));
  if (prefix >= 10 && prefix <= 29) return 19.9;
  if (prefix >= 30 && prefix <= 59) return 24.9;
  return 29.9;
}

export function getShippingOptions(zip?: string): ShippingOption[] {
  const raw = zip ?? "";
  const cep8 = isValidCEP(raw) ? normalizeCEP(raw) : "";

  if (!cep8) {
    return [
      { id: "pac", method: "delivery", carrier: "Correios PAC", cep8: "", price: 0, deadline: "Informe o CEP" },
      { id: "sedex", method: "delivery", carrier: "Correios SEDEX", cep8: "", price: 0, deadline: "Informe o CEP" },
      { id: "express", method: "delivery", carrier: "Entrega Expressa", cep8: "", price: 0, deadline: "Informe o CEP" },
    ];
  }

  const base = baseByRegion(cep8);

  return [
    { id: "pac", method: "delivery", carrier: "Correios PAC", cep8, price: base, deadline: "5 a 7 dias úteis" },
    { id: "sedex", method: "delivery", carrier: "Correios SEDEX", cep8, price: base + 18.0, deadline: "2 a 3 dias úteis" },
    { id: "express", method: "delivery", carrier: "Entrega Expressa", cep8, price: base + 29.0, deadline: "24 a 48 horas" },
  ];
}
