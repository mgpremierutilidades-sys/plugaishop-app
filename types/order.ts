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

export type Invoice = {
  // alguns mocks criam invoice sem id
  id?: string;

  number?: string;
  url?: string;
  issuedAt?: string; // ISO
  total?: number;

  // ordersStore usa isso
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

  // alguns mocks usam date, outros usam at
  date?: string; // ISO
  at?: string; // ISO

  note?: string;
  location?: string;

  // ordersStore usa isso
  title?: string;
  description?: string;
};

export type OrderReview = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string; // ISO
};

export type ReturnType = "refund" | "exchange" | "repair" | "other";

export type ReturnAttachment = {
  id: string;

  // compatibilidade: mocks usam uri
  uri?: string;

  // compatibilidade: outros fluxos usam url
  url?: string;

  mimeType?: string;
  name?: string;

  // ordersStore usa isso
  createdAt?: string; // ISO
};

export type ReturnRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "shipped_back"
  | "completed"
  // compatibilidade com mock pt-BR no ordersStore
  | "ABERTA"
  | "APROVADA"
  | "REJEITADA"
  | "CONCLUIDA";

export type ReturnRequest = {
  // em alguns pontos o ordersStore cria como “draft” sem id/orderId
  id?: string;
  orderId?: string;

  type: ReturnType;
  reason?: string;
  status?: ReturnRequestStatus;
  createdAt: string; // ISO
  protocol?: string;

  attachments?: ReturnAttachment[];
};
