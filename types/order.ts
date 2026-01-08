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
  method: "pix" | "card" | "boleto";
  status: "pending" | "paid" | "failed";
};

export type OrderDraft = {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping?: Shipping; // <<< AGORA é sempre objeto
  total: number;
  address?: Address;
  payment?: Payment;
  createdAt: string;
};

export type LogisticsEventType = "POSTED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION";

export type LogisticsEvent = {
  id: string;
  type: LogisticsEventType;
  title: string;
  location?: string;
  description?: string;
  at: string;
};

export type InvoiceStatus = "AGUARDANDO" | "EMITIDA";

export type Invoice = {
  status: InvoiceStatus;
  number?: string;
  series?: string;
  accessKey?: string;
  issuedAt?: string;
  danfeUrl?: string;
};

export type ReturnType = "Troca" | "Reembolso";

export type ReturnAttachment = {
  id: string;
  uri: string;
  createdAt: string;
};

export type ReturnRequest = {
  protocol: string;
  type: ReturnType;
  reason: string;
  status: "ABERTA" | "EM_ANALISE" | "APROVADA" | "REPROVADA" | "FINALIZADA";
  createdAt: string;
  attachments?: ReturnAttachment[];
};

export type OrderReview = {
  rating: number; // 1..5
  comment: string;
  createdAt: string;
};

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
};

export type Order = OrderDraft & {
  status: OrderStatus;
  timeline: OrderTimelineEvent[];

  unreadNotifications?: number;

  statusHistory?: Array<{ status: OrderStatus; at: string }>;
  trackingCode?: string;
  logisticsEvents?: LogisticsEvent[];
  invoice?: Invoice;
  returnRequest?: ReturnRequest;
  review?: OrderReview;
};
