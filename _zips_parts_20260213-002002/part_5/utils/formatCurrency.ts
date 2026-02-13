function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    // remove "R$", espaços e converte "129,90" -> "129.90"
    const cleaned = value
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "") // remove separador de milhar (se houver)
      .replace(",", "."); // converte decimal BR

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

export function formatCurrency(
  value: unknown,
  locale = "pt-BR",
  currency = "BRL",
) {
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
