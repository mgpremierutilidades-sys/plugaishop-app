export function normalizeCEP(input: string): string {
  return (input ?? "").replace(/\D/g, "").slice(0, 8);
}

export function formatCEP(input: string): string {
  const cep = normalizeCEP(input);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function isValidCEP(input: string): boolean {
  const cep = normalizeCEP(input);
  return cep.length === 8;
}
