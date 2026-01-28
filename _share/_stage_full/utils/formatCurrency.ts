// utils/formatCurrency.ts
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".");

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

export function formatCurrency(value: unknown, locale = "pt-BR", currency = "BRL") {
  const safe = toNumber(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function asNumber(value: unknown) {
  return toNumber(value);
}
