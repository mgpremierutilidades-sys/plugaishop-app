import type { Order } from "./order";

export type CustomerPayload = {
  name?: string;
  email?: string;
  phone?: string;
  document?: string; // CPF/CNPJ (opcional)
};

export type AddressPayload = {
  zip?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  complement?: string;
};

export type LineItemPayload = {
  sku?: string;
  productId?: string;
  title: string;
  quantity: number;
  unitPrice: number; // em reais
  discount?: number; // em reais
};

export type ShippingPayload = {
  method?: string;
  price: number;
  deadline?: string;
};

export type PaymentPayload = {
  method: "pix" | "card" | "boleto";
  status: "pending" | "paid" | "failed";
};

export type OrderPayload = {
  source: "plugaishop-app";
  orderId: string;
  createdAt: string;

  customer?: CustomerPayload;
  address?: AddressPayload;

  items: LineItemPayload[];

  subtotal: number;
  discount: number;
  shipping: ShippingPayload;
  total: number;

  payment?: PaymentPayload;

  rawOrder: Order; // mantém o original para debug/telemetria
};
