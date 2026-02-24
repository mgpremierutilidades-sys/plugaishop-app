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

export type PaymentMethod = "pix" | "card" | "boleto" | "cash" | "unknown";
export type PaymentStatus = "paid" | "pending" | "failed";

export type Payment = {
  method?: PaymentMethod;
  status?: PaymentStatus;
};

export type OrderDraft = {
  /**
   * Draft pode existir sem id nas etapas iniciais do checkout.
   * O Order final SEMPRE terá id (ver type Order abaixo).
   */
  id?: string;

  items: CartItem[];

  /** soma dos itens (sem frete/desconto) */
  subtotal: number;

  /** desconto total aplicado ao pedido (default: 0) */
  discount: number;

  shipping?: Shipping;

  /**
   * total final (subtotal - discount + shipping.price)
   * Observação: mantenha sempre consistente na camada de storage/bridge.
   */
  total: number;

  address?: Address;
  payment?: Payment;
  note?: string;
};

export type Order = Omit<OrderDraft, "id"> & {
  id: string;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  createdAt: string; // ISO
};

/**
 * Tipos adicionais usados pelo ordersStore (stubs tipados e compatíveis com mocks).
 */
export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
  read?: boolean;
  data?: Record<string, unknown>;
  orderId?: string;
};

export type Invoice = {
  id?: string;
  number?: string;
  url?: string;
  issuedAt?: string; // ISO
  total?: number;

  status?: string;
  series?: string;
  accessKey?: string;
  danfeUrl?: string;
};

export type LogisticsEventType =
  | "created"
  | "payment_pending"
  | "processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "canceled"
  | "custom";

export type LogisticsEvent = {
  id: string;
  type: LogisticsEventType;

  date?: string; // ISO
  at?: string; // ISO

  note?: string;
  location?: string;

  title?: string;
  description?: string;
};

export type OrderReview = {
  id?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string; // ISO
};

/**
 * RENOMEADO: evita conflito com o utilitário global ReturnType<T> do TS.
 */
export type ReturnKind = "refund" | "exchange" | "repair" | "other";

export type ReturnAttachment = {
  id: string;
  uri?: string;
  url?: string;
  mimeType?: string;
  name?: string;
  createdAt?: string; // ISO
};

export type ReturnRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "shipped_back"
  | "completed"
  | "ABERTA"
  | "APROVADA"
  | "REJEITADA"
  | "CONCLUIDA";

export type ReturnRequest = {
  id?: string;
  orderId?: string;

  type: ReturnKind;
  reason?: string;
  status?: ReturnRequestStatus;
  createdAt: string; // ISO
  protocol?: string;

  attachments?: ReturnAttachment[];
};