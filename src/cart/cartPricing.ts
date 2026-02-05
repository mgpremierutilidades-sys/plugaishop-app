import type { CartRow } from "./types";

export function calcRowTotal(row: CartRow): number {
  const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
  const price = Number(row.price) || 0;
  const pct = Number(row.discountPercent) || 0;
  const unit = pct > 0 ? price - (price * pct) / 100 : price;
  return Math.round(unit * qty * 100) / 100;
}
