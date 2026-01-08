// utils/ordersStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  InAppNotification,
  Invoice,
  LogisticsEvent,
  LogisticsEventType,
  Order,
  OrderReview,
  ReturnAttachment,
  ReturnRequest,
  ReturnType,
} from "../types/order";
import type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";

/**
 * Re-exports (para telas que importam de utils/ordersStore)
 * IMPORTANTE: NÃO declarar ReturnRequest aqui dentro.
 */
export type {
  InAppNotification,
  Invoice,
  LogisticsEvent,
  LogisticsEventType,
  Order,
  OrderReview,
  ReturnAttachment,
  ReturnRequest,
  ReturnType,
} from "../types/order";
export type { OrderStatus, OrderTimelineEvent } from "../types/orderStatus";

const STORAGE_KEY = "plugaishop.orders.v1";

type OrdersState = {
  orders: Order[];
  notifications: InAppNotification[];
};

let hydrated = false;
let cache: OrdersState = { orders: [], notifications: [] };

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

async function readState(): Promise<OrdersState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { orders: [], notifications: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<OrdersState>;
    return {
      orders: Array.isArray(parsed.orders) ? (parsed.orders as Order[]) : [],
      notifications: Array.isArray(parsed.notifications)
        ? (parsed.notifications as InAppNotification[])
        : [],
    };
  } catch {
    return { orders: [], notifications: [] };
  }
}

async function writeState(next: OrdersState) {
  cache = next;
  hydrated = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function ensureOrdersHydrated() {
  if (hydrated) return;
  cache = await readState();
  hydrated = true;
}

export async function saveOrders(orders: Order[]) {
  await ensureOrdersHydrated();
  await writeState({ ...cache, orders: orders ?? [] });
}

export async function listOrders(): Promise<Order[]> {
  await ensureOrdersHydrated();
  return cache.orders ?? [];
}

export async function getOrderById(id: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  const found = (cache.orders ?? []).find((o) => String((o as any).id) === String(id));
  return found ?? null;
}

export async function addOrder(order: Order): Promise<void> {
  await ensureOrdersHydrated();
  const next = [order, ...(cache.orders ?? [])];
  await writeState({ ...cache, orders: next });
}

export function normalizeStatusLabel(status?: OrderStatus | string): string {
  const s = String(status ?? "created").toLowerCase();

  if (s === "created") return "Confirmado";
  if (s === "payment_pending") return "Aguardando pagamento";
  if (s === "paid") return "Pago";
  if (s === "processing") return "Em separação";
  if (s === "shipped") return "Enviado";
  if (s === "delivered") return "Entregue";
  if (s === "canceled" || s === "cancelled") return "Cancelado";

  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function pushNotification(
  n: Omit<InAppNotification, "id" | "createdAt" | "read"> & { read?: boolean }
) {
  await ensureOrdersHydrated();

  const notif: InAppNotification = {
    id: uid("notif"),
    title: n.title,
    body: n.body,
    orderId: n.orderId,
    read: Boolean(n.read ?? false),
    createdAt: nowIso(),
  };

  await writeState({
    ...cache,
    notifications: [notif, ...(cache.notifications ?? [])],
  });
}

export async function listNotifications(): Promise<InAppNotification[]> {
  await ensureOrdersHydrated();
  return cache.notifications ?? [];
}

export async function markNotificationRead(id: string) {
  await ensureOrdersHydrated();
  const next = (cache.notifications ?? []).map((n) => (n.id === id ? { ...n, read: true } : n));
  await writeState({ ...cache, notifications: next });
}

export async function markAllNotificationsRead() {
  await ensureOrdersHydrated();
  const next = (cache.notifications ?? []).map((n) => ({ ...n, read: true }));
  await writeState({ ...cache, notifications: next });
}

export async function getUnreadNotificationsCount(): Promise<number> {
  await ensureOrdersHydrated();
  return (cache.notifications ?? []).filter((n) => !n.read).length;
}

export function createOrderFromCart(input: {
  items: Array<{ productId: string; title: string; price: number; qty: number }>;
  discount?: number;
  shipping?: number;
  status?: OrderStatus;
}): Order {
  const createdAt = nowIso();
  const id = String(Date.now());

  const subtotal = input.items.reduce(
    (acc: number, it) => acc + Number(it.price ?? 0) * Number(it.qty ?? 0),
    0
  );

  const discount = Number(input.discount ?? 0);
  const shipping = Number(input.shipping ?? 0);
  const total = Math.max(0, subtotal - discount + shipping);

  const status: OrderStatus = input.status ?? "created";
  const timeline: OrderTimelineEvent[] = [{ status: "created", date: createdAt }];

  return {
    id,
    items: input.items.map((it) => ({
      product: { id: it.productId, title: it.title, price: it.price } as any,
      productId: it.productId,
      title: it.title,
      price: it.price,
      qty: it.qty,
    })) as any,
    subtotal,
    discount,
    shipping,
    total,
    createdAt,
    status,
    timeline,
    statusHistory: [{ status: "created", at: createdAt }] as any,
    unreadNotifications: 0 as any,
    logisticsEvents: [],
  } as any;
}

function nextStatus(current: OrderStatus): OrderStatus {
  switch (current) {
    case "created":
    case "payment_pending":
      return "paid";
    case "paid":
    case "processing":
      return "shipped";
    case "shipped":
      return "delivered";
    default:
      return "delivered";
  }
}

function statusBody(status: OrderStatus) {
  switch (status) {
    case "paid":
      return "Pagamento aprovado.";
    case "shipped":
      return "Pedido enviado.";
    case "delivered":
      return "Pedido entregue.";
    case "payment_pending":
      return "Aguardando confirmação do pagamento.";
    case "processing":
      return "Pedido em separação.";
    default:
      return "Atualização do pedido.";
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const old = orders[idx] as any;
  const at = nowIso();

  const nextHist = Array.isArray(old.statusHistory) ? [...old.statusHistory] : [];
  nextHist.push({ status, at });

  const nextTimeline: OrderTimelineEvent[] = Array.isArray(old.timeline) ? [...old.timeline] : [];
  nextTimeline.push({ status, date: at });

  const updated: Order = {
    ...(old as any),
    status,
    statusHistory: nextHist,
    timeline: nextTimeline,
  };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });

  await pushNotification({
    title: `Pedido #${orderId}`,
    body: statusBody(status),
    orderId: String(orderId),
  });

  return updated;
}

export async function advanceOrderStatus(orderId: string): Promise<Order | null> {
  const found = await getOrderById(orderId);
  if (!found) return null;

  const current = ((found as any).status ?? "created") as OrderStatus;
  return updateOrderStatus(orderId, nextStatus(current));
}

export async function setTrackingCode(orderId: string, code: string): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const updated: Order = { ...(orders[idx] as any), trackingCode: String(code ?? "") };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function addLogisticsEvent(
  orderId: string,
  ev: { type: LogisticsEventType; title: string; location?: string; description?: string }
): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const old = orders[idx] as any;
  const list = Array.isArray(old.logisticsEvents) ? [...old.logisticsEvents] : [];

  const item: LogisticsEvent = {
    id: uid("log"),
    type: ev.type,
    title: ev.title,
    location: ev.location,
    description: ev.description,
    at: nowIso(),
  };

  list.unshift(item);

  const updated: Order = { ...(old as any), logisticsEvents: list };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function clearLogisticsEvents(orderId: string): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const updated: Order = { ...(orders[idx] as any), logisticsEvents: [] };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function setInvoiceMock(orderId: string): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const issuedAt = nowIso();
  const invoice: Invoice = {
    status: "EMITIDA",
    number: String(Math.floor(100000 + Math.random() * 900000)),
    series: "1",
    accessKey: `${Math.floor(1e10 + Math.random() * 9e10)}${Math.floor(
      1e10 + Math.random() * 9e10
    )}`,
    issuedAt,
    danfeUrl: "https://example.com/danfe.pdf",
  };

  const updated: Order = { ...(orders[idx] as any), invoice };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function clearInvoice(orderId: string): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const updated: Order = { ...(orders[idx] as any), invoice: undefined };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function createReturnRequest(
  orderId: string,
  type: ReturnType,
  reason: string
): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const rr: ReturnRequest = {
    protocol: `RR-${Date.now()}`,
    type,
    reason,
    status: "ABERTA",
    createdAt: nowIso(),
    attachments: [],
  };

  const updated: Order = { ...(orders[idx] as any), returnRequest: rr };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function addReturnAttachment(orderId: string, uri: string): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const old = orders[idx] as any;
  if (!old.returnRequest) return null;

  const att: ReturnAttachment = { id: uid("att"), uri: String(uri), createdAt: nowIso() };

  const nextReq: ReturnRequest = {
    ...(old.returnRequest as ReturnRequest),
    attachments: [...((old.returnRequest.attachments as ReturnAttachment[]) ?? []), att],
  };

  const updated: Order = { ...(old as any), returnRequest: nextReq };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export async function setOrderReview(
  orderId: string,
  stars: number,
  comment: string
): Promise<Order | null> {
  await ensureOrdersHydrated();

  const orders = cache.orders ?? [];
  const idx = orders.findIndex((o) => String((o as any).id) === String(orderId));
  if (idx < 0) return null;

  const s = Math.max(1, Math.min(5, Number(stars ?? 5)));

  const rev: OrderReview = {
    rating: s,
    comment: String(comment ?? ""),
    createdAt: nowIso(),
  } as any;

  (rev as any).stars = s;

  const updated: Order = { ...(orders[idx] as any), review: rev };

  const nextOrders = [...orders];
  nextOrders[idx] = updated;

  await writeState({ ...cache, orders: nextOrders });
  return updated;
}

export function getTrackingUrl(code?: string | null) {
  const c = String(code ?? "").trim();
  if (!c) return null;
  return `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objetos=${encodeURIComponent(
    c
  )}`;
}

export function computeAutoStatus(order: Order): OrderStatus {
  return ((order as any).status ?? "created") as OrderStatus;
}

export function buildOrderSupportText(order: Order) {
  const id = String((order as any).id ?? "");
  const total = String((order as any).total ?? "");
  const trackingCode = String((order as any).trackingCode ?? "");
  const status = normalizeStatusLabel((order as any).status);

  return [
    `Pedido #${id}`,
    `Status: ${status}`,
    total ? `Total: ${total}` : "",
    trackingCode ? `Rastreio: ${trackingCode}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
