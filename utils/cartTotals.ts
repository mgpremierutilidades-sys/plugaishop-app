export type CartTotalsInput = {
  subtotal: number;
  qty: number;
};

export type CartTotals = {
  subtotal: number;
  freight: number;
  total: number;
};

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Frete mock determinístico (consistente em todo o app).
 * Regras (simples e previsíveis):
 * - subtotal <= 0 => frete 0
 * - subtotal >= 200 => frete 0 (frete grátis)
 * - caso contrário:
 *   base 19.9 + (qty-1)*2.5 (cap em 39.9)
 */
export function computeFreightMock(subtotal: number, qty: number) {
  const s = Number(subtotal) || 0;
  const q = Math.max(0, Math.floor(Number(qty) || 0));

  if (s <= 0 || q <= 0) return 0;
  if (s >= 200) return 0;

  const base = 19.9;
  const extra = Math.max(0, q - 1) * 2.5;
  const freight = Math.min(39.9, base + extra);

  return round2(freight);
}

export function computeCartTotals(input: CartTotalsInput): CartTotals {
  const subtotal = round2(input.subtotal);
  const freight = computeFreightMock(subtotal, input.qty);
  const total = round2(subtotal + freight);

  return { subtotal, freight, total };
}