import type { Payment } from "../types/order";

export type PixMock = {
  type: "pix";
  qrText: string;
  expiresAt: string; // ISO
};

export type BoletoMock = {
  type: "boleto";
  barcode: string;
  expiresAt: string; // ISO
};

export type CardMock = {
  type: "card";
  last4: string;
  brand: "visa" | "mastercard" | "elo" | "amex" | "other";
};

export type PaymentMockPayload = PixMock | BoletoMock | CardMock;

function addHoursISO(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function createPayment(method: Payment["method"]): Payment {
  return { method, status: "pending" };
}

export function createPaymentPayload(
  method: Payment["method"],
  args?: { last4?: string; brand?: CardMock["brand"] },
): PaymentMockPayload {
  if (method === "pix") {
    return {
      type: "pix",
      qrText: `00020126PLUGAISHOP-MOCK-${Date.now()}-END`,
      expiresAt: addHoursISO(2),
    };
  }

  if (method === "boleto") {
    return {
      type: "boleto",
      barcode: `34191.79001 01043.510047 91020.150008 8 ${String(Date.now()).slice(-10)}`,
      expiresAt: addHoursISO(48),
    };
  }

  // card
  const last4 = (args?.last4 ?? "0000").slice(-4);
  const brand = args?.brand ?? "other";
  return { type: "card", last4, brand };
}
