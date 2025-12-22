import { products } from "../data/catalog";

export type OrderStatus = "Confirmado" | "Pago" | "Enviado" | "Entregue";

export type OrderItem = {
  productId: string;
  qty: number;
  price: number; // preço no momento do pedido
  title: string; // título no momento do pedido
};

export type Order = {
  id: string;
  createdAt: string; // ISO ou string livre para mock
  status: OrderStatus;
  discount: number;
  shipping: number;
  items: OrderItem[];
};

function pick(index: number) {
  const p = (products as any[])[index];
  if (!p) return null;

  return {
    productId: String(p.id),
    qty: 1,
    price: Number(p.price ?? 0),
    title: String(p.title ?? "Produto"),
  } as OrderItem;
}

const a = pick(0);
const b = pick(1);
const c = pick(2);
const d = pick(3);

export const orders: Order[] = [
  {
    id: "100021",
    createdAt: "2025-12-18",
    status: "Entregue",
    discount: 15.0,
    shipping: 19.9,
    items: [a, b].filter(Boolean) as OrderItem[],
  },
  {
    id: "100022",
    createdAt: "2025-12-19",
    status: "Enviado",
    discount: 0,
    shipping: 24.9,
    items: [c].filter(Boolean) as OrderItem[],
  },
  {
    id: "100023",
    createdAt: "2025-12-20",
    status: "Pago",
    discount: 10.0,
    shipping: 0,
    items: [d, a].filter(Boolean) as OrderItem[],
  },
];
