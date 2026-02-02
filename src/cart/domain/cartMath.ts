export function clampQty(qty: number, min = 1, max = 99) {
  if (!Number.isFinite(qty)) return min;
  return Math.max(min, Math.min(max, Math.trunc(qty)));
}

export function calcLineTotal(unitPrice: number, qty: number) {
  const q = clampQty(qty);
  const p = Number.isFinite(unitPrice) ? unitPrice : 0;
  return p * q;
}
