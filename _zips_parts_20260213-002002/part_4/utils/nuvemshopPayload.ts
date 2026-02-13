import type { OrderPayload } from "../types/orderPayload";

export type NuvemshopOrderPayload = {
  external_id: string;
  created_at: string;

  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };

  shipping_address?: {
    zip?: string;
    address?: string;
    number?: string;
    city?: string;
    province?: string; // UF
    complement?: string;
  };

  items: {
    sku?: string;
    title: string;
    quantity: number;
    price: number;
    discount?: number;
  }[];

  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  };

  shipping?: {
    method?: string;
    price: number;
    deadline?: string;
  };

  payment?: {
    method: "pix" | "card" | "boleto";
    status: "pending" | "paid" | "failed";
  };

  note?: string;
};

export function toNuvemshopPayload(p: OrderPayload): NuvemshopOrderPayload {
  return {
    external_id: p.orderId,
    created_at: p.createdAt,

    customer: p.customer
      ? {
          name: p.customer.name,
          email: p.customer.email,
          phone: p.customer.phone,
          document: p.customer.document,
        }
      : undefined,

    shipping_address: p.address
      ? {
          zip: p.address.zip,
          address: p.address.street,
          number: p.address.number,
          city: p.address.city,
          province: p.address.state,
          complement: p.address.complement,
        }
      : undefined,

    items: p.items.map((it) => ({
      sku: it.sku,
      title: it.title,
      quantity: it.quantity,
      price: it.unitPrice,
      discount: it.discount ?? 0,
    })),

    totals: {
      subtotal: p.subtotal,
      discount: p.discount,
      shipping: p.shipping.price,
      total: p.total,
    },

    shipping: {
      method: p.shipping.method,
      price: p.shipping.price,
      deadline: p.shipping.deadline,
    },

    payment: p.payment
      ? { method: p.payment.method, status: p.payment.status }
      : undefined,

    note: `Pedido gerado pelo app Plugaí Shop (${p.orderId}).`,
  };
}
