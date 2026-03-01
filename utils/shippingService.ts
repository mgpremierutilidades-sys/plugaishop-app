import type { Shipping } from "../types/order";
import { isValidCEP, normalizeCEP } from "./cep";

/**
 * Cotação mock determinística por CEP + subtotal
 * - Não usa rede
 * - Sempre retorna o mesmo resultado para o mesmo CEP
 */
export function getShippingQuote(params: {
  cep: string;
  subtotal: number;
}): Shipping | null {
  const cep = normalizeCEP(params.cep);
  if (!isValidCEP(cep)) return null;

  const subtotal = Number.isFinite(params.subtotal) ? params.subtotal : 0;

  // hash simples e determinístico
  let h = 0;
  for (let i = 0; i < cep.length; i++) h = (h * 31 + cep.charCodeAt(i)) >>> 0;

  // região mock: usa prefixo como influência
  const prefix = Number(cep.slice(0, 3)); // 0..999
  const regionFactor = (prefix % 10) / 10; // 0.0..0.9

  // preço base + variação
  const base = 14.9 + regionFactor * 9.5; // 14.90..23.45
  const jitter = (h % 700) / 100; // 0.00..6.99
  const price = Math.max(0, base + jitter);

  // frete grátis mock por subtotal
  const freeThreshold = 199.0;
  const finalPrice = subtotal >= freeThreshold ? 0 : Number(price.toFixed(2));

  // prazo mock
  const days = 2 + (h % 6); // 2..7
  const deadline = `${days} dias úteis`;

  const method = finalPrice === 0 ? "grátis" : "padrão";

  return { method, price: finalPrice, deadline };
}

/**
 * Compat: checkout/shipping.tsx espera getShippingOptions().
 * Retorna uma lista de opções (padrão + expresso + grátis quando aplicável).
 */
export type ShippingOption = Shipping & { id: string; title: string; subtitle?: string };

export function getShippingOptions(params: {
  cep: string;
  subtotal: number;
}): ShippingOption[] {
  const cep = normalizeCEP(params.cep);
  if (!isValidCEP(cep)) return [];

  const base = getShippingQuote(params);
  if (!base) return [];

  // Expresso mock (mais caro, mais rápido)
  const expPrice = base.price === 0 ? 19.9 : Number((base.price * 1.65 + 7.9).toFixed(2));
  const expDays = Math.max(1, Math.max(2, parseInt(base.deadline, 10) || 3) - 2);
  const express: ShippingOption = {
    id: "express",
    title: "Expresso",
    method: "expresso",
    price: expPrice,
    deadline: `${expDays} dias úteis`,
    subtitle: "Chega mais rápido",
  };

  const standard: ShippingOption = {
    id: "standard",
    title: base.price === 0 ? "Grátis" : "Padrão",
    method: base.method,
    price: base.price,
    deadline: base.deadline,
    subtitle: base.price === 0 ? "Frete grátis no seu pedido" : "Melhor custo-benefício",
  };

  // Se for grátis por threshold, mantém só grátis e expresso (padrão vira grátis)
  // Se não for grátis, mantém padrão e expresso.
  return [standard, express];
}