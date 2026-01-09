// types/order.ts
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
  method?: "pix" | "card" | "boleto" | "cash" | "unknown";
  status?: "paid" | "pending" | "failed";
};

export type OrderDraft = {
  id: string;
  items: CartItem[];
  subtotal: number;

  /** desconto total aplicado ao pedido (default: 0) */
  discount: number;

  shipping?: Shipping;
  total: number;
  address?: Address;
  payment?: Payment;
  note?: string;
};

export type Order = OrderDraft & {
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  createdAt: string; // ISO string
};

/**
 * Tipos adicionais usados pelo ordersStore (stubs tipados e compatíveis com mocks).
 * Mantemos permissivos para não quebrar o app e permitir evolução futura.
 */
export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
  read?: boolean;
  data?: Record<string, any>;

  // ordersStore usa isso em alguns pontos
  orderId?: string;
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
