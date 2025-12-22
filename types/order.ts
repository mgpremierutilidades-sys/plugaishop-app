import type { CartItem } from "../context/CartContext";

export type Address = {
  id: string;
  label?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type Shipping = {
  method: string;
  price: number;
  deadline: string;
};

export type Payment = {
  method: "pix" | "card" | "boleto";
  status: "pending" | "paid" | "failed";
};

export type OrderDraft = {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping?: Shipping;
  total: number;
  address?: Address;
  payment?: Payment;
  createdAt: string;
};

export type OrderStatus =
  | "processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "canceled";

export type OrderStatusEvent = {
  status: OrderStatus;
  at: string; // ISO
  label: string;
};

export type Order = OrderDraft & {
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
};
