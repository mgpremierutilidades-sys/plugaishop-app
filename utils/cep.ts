export function normalizeCEP(input: string): string {
  return String(input ?? "").replace(/\D/g, "").slice(0, 8);
}

export function isValidCEP(input: string): boolean {
  const n = normalizeCEP(input);
  return n.length === 8;
}

export function formatCEP(input: string): string {
  const n = normalizeCEP(input);
  if (n.length <= 5) return n;
  return `${n.slice(0, 5)}-${n.slice(5)}`;
}