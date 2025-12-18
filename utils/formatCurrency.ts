// utils/formatCurrency.ts

export function formatCurrencyBRL(value: number): string {
  if (isNaN(value)) {
    return "R$ 0,00";
  }

  const fixed = value.toFixed(2); // "1899.90"
  const [integerPart, decimalPart] = fixed.split(".");

  const integerWithDots = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "."
  );

  return `R$ ${integerWithDots},${decimalPart}`;
}
