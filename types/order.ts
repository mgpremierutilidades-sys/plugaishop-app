import type { CartItem } from "../context/CartContext";
import type { OrderStatus, OrderTimelineEvent } from "./orderStatus";

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

/**
 * Pedido final (já "criado" no sistema).
 * Importante: NÃO redefinir OrderStatus aqui.
 * Ele vem de ./orderStatus (fonte única).
 */
export type Order = OrderDraft & {
  status: OrderStatus;

  /**
   * Linha do tempo do pedido (o seu orderTimelineAuto depende disso).
   */
  timeline: OrderTimelineEvent[];

  /**
   * Contador simples para badge/alertas (se você quiser usar).
   * Pode manter opcional sem quebrar nada.
   */
  unreadNotifications?: number;
};
