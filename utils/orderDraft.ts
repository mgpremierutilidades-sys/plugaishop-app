import type { CartItem } from "../context/CartContext";

export type OrderDraft = {
  id: string;
  createdAt: string;

  items: {
    id: string;
    title: string;
    qty: number;
    price: number;
  }[];

  subtotal: number;
  shipping: number;
  total: number;

  address: any | null;
  payment: string | null;

  channel: "app" | "web" | string;
  source: string;
};

function uid() {
  // simples e estável (sem libs)
  return `OD-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function buildOrderDraft(input: {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: any | null;
  payment: string | null;
  channel: string;
  source: string;
}): OrderDraft {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    items: input.items.map((it) => ({
      id: it.id,
      title: it.product?.title ?? "Produto",
      qty: it.qty,
      price: Number(it.product?.price ?? 0),
    })),
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    address: input.address,
    payment: input.payment,
    channel: input.channel,
    source: input.source,
  };
}
