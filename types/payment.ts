export type PaymentMethod = "pix" | "card" | "boleto";

export type PaymentSelection = {
  method: PaymentMethod;
  selectedAtUtc: string;
};