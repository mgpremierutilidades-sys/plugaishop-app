// utils/money.ts
/**
 * Money helpers (centavos)
 * - Evita bugs de ponto flutuante em totals/descontos.
 * - Regra: tudo é calculado em centavos (inteiro) e convertido no final.
 */

export const MONEY_SCALE = 100;

export function toCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Arredondamento bancário não é necessário aqui; usamos Math.round.
  return Math.round(n * MONEY_SCALE);
}

export function fromCents(cents: unknown): number {
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return 0;
  return n / MONEY_SCALE;
}

export function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function clampCents(cents: unknown): number {
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export function roundPercentOfCents(baseCents: number, pct: unknown): number {
  const p = typeof pct === "number" ? pct : Number(pct);
  if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round((baseCents * p) / 100);
}

export function moneyMinCents(a: number, b: number): number {
  return Math.min(clampCents(a), clampCents(b));
}
