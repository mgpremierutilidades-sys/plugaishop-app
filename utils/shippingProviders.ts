import type { ShippingQuote, ShippingRequest } from "../types/shippingProviders";

export async function quoteCorreios(_req: ShippingRequest): Promise<ShippingQuote[]> {
  // mock agora; depois troca por chamada real
  return [
    { provider: "correios", service: "PAC", price: 24.9, deadline: "5 a 7 dias úteis" },
    { provider: "correios", service: "SEDEX", price: 42.9, deadline: "2 a 3 dias úteis" },
  ];
}

export async function quoteLoggi(_req: ShippingRequest): Promise<ShippingQuote[]> {
  return [
    { provider: "loggi", service: "Express", price: 55.9, deadline: "24 a 48 horas" },
  ];
}

export async function quoteDropi(_req: ShippingRequest): Promise<ShippingQuote[]> {
  return [
    { provider: "dropi", service: "Padrão", price: 29.9, deadline: "5 a 9 dias úteis" },
  ];
}

export async function getAllQuotes(req: ShippingRequest): Promise<ShippingQuote[]> {
  const [c, l, d] = await Promise.all([quoteCorreios(req), quoteLoggi(req), quoteDropi(req)]);
  return [...c, ...l, ...d].sort((a, b) => a.price - b.price);
}
