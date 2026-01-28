import type { Shipping } from "../types/order";
import { normalizeCEP, isValidCEP } from "./cep";

export type ShippingOption = Shipping & {
  id: "pac" | "sedex" | "express";
};

function baseByRegion(cep8: string): number {
  // Heurística simples por faixa de CEP (mock)
  // 0–3: Sudeste / 4–6: Sul / 7–9: Centro-Oeste/Norte/Nordeste (aprox.)
  const first = Number(cep8[0] ?? 9);
  if (first <= 3) return 24.9;
  if (first <= 6) return 29.9;
  return 34.9;
}

export function getShippingOptions(zipRaw: string): ShippingOption[] {
  const zip = normalizeCEP(zipRaw);

  if (!isValidCEP(zip)) {
    return [
      { id: "pac", method: "Correios PAC", price: 0, deadline: "Informe o CEP" },
      { id: "sedex", method: "Correios SEDEX", price: 0, deadline: "Informe o CEP" },
      { id: "express", method: "Entrega Expressa", price: 0, deadline: "Informe o CEP" },
    ];
  }

  const base = baseByRegion(zip);

  // Opções mock (mas com cara de real)
  return [
    { id: "pac", method: "Correios PAC", price: base, deadline: "5 a 7 dias úteis" },
    { id: "sedex", method: "Correios SEDEX", price: base + 18.0, deadline: "2 a 3 dias úteis" },
    { id: "express", method: "Entrega Expressa", price: base + 29.0, deadline: "24 a 48 horas" },
  ];
}

export function pickDefaultShipping(zipRaw: string): ShippingOption {
  const options = getShippingOptions(zipRaw);
  // Default: PAC
  return options[0];
}
