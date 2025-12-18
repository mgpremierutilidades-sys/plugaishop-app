// constants/orders.ts
import { PRODUCTS, type Product } from "./products";

export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  product: Product;
  quantity: number;
};

export type Order = {
  id: string;
  code: string;
  createdAt: string; // ISO string
  status: OrderStatus;
  total: number;
  items: OrderItem[]; // <- aqui é ARRAY de itens
};

const order1Items: OrderItem[] = [
  { product: PRODUCTS[0], quantity: 1 },
  { product: PRODUCTS[1], quantity: 1 },
];

const order2Items: OrderItem[] = [
  { product: PRODUCTS[2], quantity: 2 },
];

const order3Items: OrderItem[] = [
  { product: PRODUCTS[3], quantity: 1 },
  { product: PRODUCTS[4], quantity: 1 },
];

export const ORDERS: Order[] = [
  {
    id: "1",
    code: "#PLG-2025-0001",
    createdAt: "2025-12-08T14:32:00Z",
    status: "processing",
    items: order1Items,
    total: order1Items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    ),
  },
  {
    id: "2",
    code: "#PLG-2025-0002",
    createdAt: "2025-12-05T18:10:00Z",
    status: "delivered",
    items: order2Items,
    total: order2Items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    ),
  },
  {
    id: "3",
    code: "#PLG-2025-0003",
    createdAt: "2025-11-30T11:05:00Z",
    status: "shipped",
    items: order3Items,
    total: order3Items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    ),
  },
];

export function getOrderById(id: string): Order | undefined {
  return ORDERS.find((order) => order.id === id);
}
