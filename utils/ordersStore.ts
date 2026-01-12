// utils/ordersStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ORDERS_STORAGE_KEY = "plugaishop.orders.v1" as const;
const NOTIFS_STORAGE_KEY = "plugaishop.orders.notifications.v1" as const;

// -----------------------------------------------------------------------------
// Types (retrocompatíveis com a base atual do app)
// -----------------------------------------------------------------------------

export type OrderStatus =
  // Canon (EN)
  | "pending"
  | "confirmed"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "canceled"
  // Legacy PT-BR (para não quebrar telas antigas)
  | "Pendente"
  | "Confirmado"
  | "Pago"
  | "Processando"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

export type PaymentMethod =
  | "pix"
  | "card"
  | "boleto"
  | "cash"
  | "wallet"
  | "unknown";

export type Address = {
  name?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type OrderItem = {
  productId: string;
  title: string;
  price: number; // preço unitário
  qty: number;
  image?: any;
};

export type StatusHistoryEntry = {
  status: OrderStatus;
  at: string; // ISO
};

export type Invoice = {
  number?: string;
  series?: string;
  issuedAt?: string;
  key?: string;
  url?: string;
};

export type ReturnType = "refund" | "exchange";

export type ReturnAttachment = {
  id: string;
  uri: string;
  name?: string;
  createdAt: string;
};

export type ReturnRequest = {
  type: ReturnType;
  reason: string;
  status: "requested" | "approved" | "rejected" | "received" | "refunded" | "exchanged";
  protocol: string;
  createdAt: string;
  attachments?: ReturnAttachment[];
};

export type OrderReview = {
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string;
};

export type LogisticsEventType =
  | "label_created"
  | "picked_up"
  | "in_transit"
  | "arrived_at_facility"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export type LogisticsEvent = {
  id: string;
  type: LogisticsEventType;
  at: string; // ISO
  description?: string;
  location?: string;
};

export type Order = {
  id: string;
  createdAt: string; // ISO
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount?: number; // valor absoluto
  shipping?: number; // valor absoluto
  total: number;
  paymentMethod?: PaymentMethod;
  address?: Address;

  // Extras usados por telas do projeto
  statusHistory?: StatusHistoryEntry[];
  trackingCode?: string;
  invoice?: Invoice;
  returnRequest?: ReturnRequest;
  review?: OrderReview;
  logisticsEvents?: LogisticsEvent[];
  notes?: string;
};

export type InAppNotification = {
  id: string;
  createdAt: string; // ISO
  orderId?: string;
  title: string;
  body: string;
  read: boolean;
};

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

type OrdersState = {
  hydrated: boolean;
  orders: Order[];
};

type NotifsState = {
  hydrated: boolean;
  list: InAppNotification[];
};

const ordersState: OrdersState = { hydrated: false, orders: [] };
const notifsState: NotifsState = { hydrated: false, list: [] };

let ordersHydratePromise: Promise<void> | null = null;
let notifsHydratePromise: Promise<void> | null = null;

function safeNumber(n: unknown, fallback = 0) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function genId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function nowISO() {
  return new Date().toISOString();
}

function normalizeStatus(s: unknown): OrderStatus {
  const raw = String(s ?? "pending").trim();

  const lower = raw.toLowerCase();
  // PT-BR -> Canon
  if (lower === "confirmado") return "Confirmado";
  if (lower === "pago") return "Pago";
  if (lower === "enviado") return "Enviado";
  if (lower === "entregue") return "Entregue";
  if (lower === "cancelado") return "Cancelado";
  if (lower === "pendente") return "Pendente";
  if (lower === "processando") return "Processando";

  // Canon EN
  if (lower === "confirmed") return "confirmed";
  if (lower === "paid") return "paid";
  if (lower === "shipped") return "shipped";
  if (lower === "delivered") return "delivered";
  if (lower === "canceled") return "canceled";
  if (lower === "processing") return "processing";
  if (lower === "pending") return "pending";

  // Se já veio com uma das strings do union, retorna como está
  return raw as OrderStatus;
}

function computeTotals(items: OrderItem[], discount?: number, shipping?: number) {
  const subtotal = items.reduce(
    (acc, it) => acc + safeNumber(it.price) * safeNumber(it.qty, 1),
    0
  );
  const d = safeNumber(discount, 0);
  const s = safeNumber(shipping, 0);
  const total = Math.max(0, subtotal - d + s);
  return { subtotal, total };
}

async function persistOrders() {
  await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersState.orders));
}

async function persistNotifs() {
  await AsyncStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifsState.list));
}

function normalizeOrder(raw: any): Order {
  const items: OrderItem[] = Array.isArray(raw?.items)
    ? raw.items.map((it: any) => ({
        productId: String(it?.productId ?? ""),
        title: String(it?.title ?? ""),
        price: safeNumber(it?.price, 0),
        qty: safeNumber(it?.qty, 1),
        image: it?.image,
      }))
    : [];

  const discount = raw?.discount == null ? undefined : safeNumber(raw.discount, 0);
  const shipping = raw?.shipping == null ? undefined : safeNumber(raw.shipping, 0);
  const totals = computeTotals(items, discount, shipping);

  const status = normalizeStatus(raw?.status ?? "pending");

  return {
    id: String(raw?.id ?? genId("ord")),
    createdAt: String(raw?.createdAt ?? nowISO()),
    status,
    items,
    subtotal: safeNumber(raw?.subtotal, totals.subtotal),
    discount,
    shipping,
    total: safeNumber(raw?.total, totals.total),
    paymentMethod: raw?.paymentMethod ?? "unknown",
    address: raw?.address,

    statusHistory: Array.isArray(raw?.statusHistory) ? raw.statusHistory : undefined,
    trackingCode: raw?.trackingCode,
    invoice: raw?.invoice,
    returnRequest: raw?.returnRequest,
    review: raw?.review,
    logisticsEvents: Array.isArray(raw?.logisticsEvents) ? raw.logisticsEvents : undefined,
    notes: raw?.notes,
  };
}

function normalizeNotif(raw: any): InAppNotification {
  return {
    id: String(raw?.id ?? genId("notif")),
    createdAt: String(raw?.createdAt ?? nowISO()),
    orderId: raw?.orderId ? String(raw.orderId) : undefined,
    title: String(raw?.title ?? "Atualização"),
    body: String(raw?.body ?? ""),
    read: Boolean(raw?.read ?? false),
  };
}

// -----------------------------------------------------------------------------
// Hydration
// -----------------------------------------------------------------------------

export async function ensureOrdersHydrated(): Promise<void> {
  if (ordersState.hydrated) return;
  if (ordersHydratePromise) return ordersHydratePromise;

  ordersHydratePromise = (async () => {
    try {
      const json = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      const parsed = json ? JSON.parse(json) : [];
      ordersState.orders = Array.isArray(parsed)
        ? parsed.map(normalizeOrder).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        : [];
      ordersState.hydrated = true;
    } catch {
      ordersState.orders = [];
      ordersState.hydrated = true;
    }
  })();

  return ordersHydratePromise;
}

async function ensureNotifsHydrated(): Promise<void> {
  if (notifsState.hydrated) return;
  if (notifsHydratePromise) return notifsHydratePromise;

  notifsHydratePromise = (async () => {
    try {
      const json = await AsyncStorage.getItem(NOTIFS_STORAGE_KEY);
      const parsed = json ? JSON.parse(json) : [];
      notifsState.list = Array.isArray(parsed)
        ? parsed.map(normalizeNotif).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        : [];
      notifsState.hydrated = true;
    } catch {
      notifsState.list = [];
      notifsState.hydrated = true;
    }
  })();

  return notifsHydratePromise;
}

// -----------------------------------------------------------------------------
// Core API (nova)
// -----------------------------------------------------------------------------

export async function getOrders(): Promise<Order[]> {
  await ensureOrdersHydrated();
  return [...ordersState.orders];
}

export async function listOrders(): Promise<Order[]> {
  return getOrders();
}

// IMPORTANT: devolve null (não undefined) para bater com setState(Order | null)
export async function getOrderById(id: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  return ordersState.orders.find((o) => o.id === id) ?? null;
}

export type CreateOrderInput = {
  items: OrderItem[];
  discount?: number;
  shipping?: number;
  paymentMethod?: PaymentMethod;
  address?: Address;
  status?: OrderStatus;
  notes?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  await ensureOrdersHydrated();

  const items = Array.isArray(input.items) ? input.items : [];
  const discount = input.discount == null ? undefined : safeNumber(input.discount, 0);
  const shipping = input.shipping == null ? undefined : safeNumber(input.shipping, 0);
  const totals = computeTotals(items, discount, shipping);

  const status = normalizeStatus(input.status ?? "Confirmado");
  const createdAt = nowISO();

  const order: Order = {
    id: genId("ord"),
    createdAt,
    status,
    items,
    subtotal: totals.subtotal,
    discount,
    shipping,
    total: totals.total,
    paymentMethod: input.paymentMethod ?? "unknown",
    address: input.address,
    notes: input.notes,
    statusHistory: [{ status, at: createdAt }],
    logisticsEvents: [],
  };

  ordersState.orders = [order, ...ordersState.orders];
  await persistOrders();

  // notificação inicial
  await addNotification({
    orderId: order.id,
    title: "Pedido confirmado",
    body: "Seu pedido foi registrado com sucesso.",
  });

  return order;
}

export async function setOrders(orders: Order[]): Promise<void> {
  ordersState.orders = Array.isArray(orders) ? orders.map(normalizeOrder) : [];
  ordersState.hydrated = true;
  ordersHydratePromise = null;
  await persistOrders();
}

export async function saveOrders(orders?: Order[]): Promise<void> {
  await ensureOrdersHydrated();
  if (orders) {
    await setOrders(orders);
    return;
  }
  await persistOrders();
}

export async function clearOrders(): Promise<void> {
  ordersState.orders = [];
  ordersState.hydrated = true;
  ordersHydratePromise = null;
  await AsyncStorage.removeItem(ORDERS_STORAGE_KEY);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  await ensureOrdersHydrated();

  const idx = ordersState.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;

  const normalized = normalizeStatus(status);
  const at = nowISO();

  const current = ordersState.orders[idx];
  const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
  history.push({ status: normalized, at });

  const updated: Order = { ...current, status: normalized, statusHistory: history };

  ordersState.orders = [
    updated,
    ...ordersState.orders.slice(0, idx),
    ...ordersState.orders.slice(idx + 1),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  await persistOrders();

  await addNotification({
    orderId: updated.id,
    title: "Status do pedido atualizado",
    body: `Novo status: ${String(updated.status)}`,
  });

  return updated;
}

export async function advanceOrderStatus(id: string): Promise<Order | null> {
  const order = await getOrderById(id);
  if (!order) return null;

  const flow: OrderStatus[] = ["Confirmado", "Pago", "Enviado", "Entregue"];
  const cur = normalizeStatus(order.status);
  const i = flow.findIndex((s) => s === cur);
  const next = i >= 0 && i < flow.length - 1 ? flow[i + 1] : cur;

  return updateOrderStatus(id, next);
}

// -----------------------------------------------------------------------------
// Legacy API (para telas antigas: success.tsx etc.)
// -----------------------------------------------------------------------------

export async function addOrder(order: Order): Promise<Order> {
  await ensureOrdersHydrated();
  const normalized = normalizeOrder(order);
  ordersState.orders = [normalized, ...ordersState.orders];
  await persistOrders();
  return normalized;
}

export type CartLikeItem = {
  productId?: string;
  id?: string;
  title: string;
  price: number;
  qty: number;
  image?: any;
};

export type CartLike = {
  items: CartLikeItem[];
  discount?: number;
  shippingPrice?: number;
  shipping?: number;
  paymentMethod?: PaymentMethod;
  address?: Address;
  notes?: string;
};

export async function createOrderFromCart(cart: CartLike): Promise<Order> {
  const items: OrderItem[] = (cart?.items ?? []).map((it) => ({
    productId: String(it.productId ?? it.id ?? ""),
    title: String(it.title ?? ""),
    price: safeNumber(it.price, 0),
    qty: safeNumber(it.qty, 1),
    image: it.image,
  }));

  const discount = cart?.discount;
  const shipping = cart?.shipping ?? cart?.shippingPrice;

  return createOrder({
    items,
    discount,
    shipping,
    paymentMethod: cart?.paymentMethod ?? "unknown",
    address: cart?.address,
    status: "Confirmado",
    notes: cart?.notes,
  });
}

// -----------------------------------------------------------------------------
// Notifications API (telas app/orders/notifications.tsx)
// -----------------------------------------------------------------------------

async function addNotification(input: { orderId?: string; title: string; body: string }) {
  await ensureNotifsHydrated();
  const notif: InAppNotification = {
    id: genId("notif"),
    createdAt: nowISO(),
    orderId: input.orderId,
    title: input.title,
    body: input.body,
    read: false,
  };
  notifsState.list = [notif, ...notifsState.list];
  await persistNotifs();
  return notif;
}

export async function listNotifications(): Promise<InAppNotification[]> {
  await ensureNotifsHydrated();
  return [...notifsState.list];
}

export async function markNotificationRead(id: string): Promise<void> {
  await ensureNotifsHydrated();
  notifsState.list = notifsState.list.map((n) => (n.id === id ? { ...n, read: true } : n));
  await persistNotifs();
}

export async function markAllNotificationsRead(): Promise<void> {
  await ensureNotifsHydrated();
  notifsState.list = notifsState.list.map((n) => ({ ...n, read: true }));
  await persistNotifs();
}

export async function getUnreadNotificationsCount(): Promise<number> {
  await ensureNotifsHydrated();
  return notifsState.list.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
}

// -----------------------------------------------------------------------------
// Tracking / Logistics (telas tracking.tsx)
// -----------------------------------------------------------------------------

export async function setTrackingCode(orderId: string, code: string): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order, trackingCode: String(code ?? "") };
  await replaceOrder(updated);

  await addNotification({
    orderId,
    title: "Código de rastreio atualizado",
    body: `Rastreio: ${updated.trackingCode}`,
  });

  return updated;
}

export async function addLogisticsEvent(orderId: string, event: Omit<LogisticsEvent, "id">): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const list = Array.isArray(order.logisticsEvents) ? [...order.logisticsEvents] : [];
  list.unshift({ ...event, id: genId("lge") });

  const updated: Order = { ...order, logisticsEvents: list };
  await replaceOrder(updated);
  return updated;
}

export async function clearLogisticsEvents(orderId: string): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order, logisticsEvents: [] };
  await replaceOrder(updated);
  return updated;
}

// -----------------------------------------------------------------------------
// Invoice (telas invoice.tsx)
// -----------------------------------------------------------------------------

export async function setInvoiceMock(orderId: string, invoice: Invoice): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order, invoice: { ...(order.invoice ?? {}), ...(invoice ?? {}) } };
  await replaceOrder(updated);
  return updated;
}

export async function clearInvoice(orderId: string): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order, invoice: undefined };
  await replaceOrder(updated);
  return updated;
}

// -----------------------------------------------------------------------------
// Return flow (telas return.tsx)
// -----------------------------------------------------------------------------

export async function createReturnRequest(
  orderId: string,
  input: { type: ReturnType; reason: string }
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const req: ReturnRequest = {
    type: input.type,
    reason: String(input.reason ?? ""),
    status: "requested",
    protocol: `RR-${Date.now().toString(36).toUpperCase()}`,
    createdAt: nowISO(),
    attachments: [],
  };

  const updated: Order = { ...order, returnRequest: req };
  await replaceOrder(updated);

  await addNotification({
    orderId,
    title: "Solicitação de devolução criada",
    body: `Protocolo: ${req.protocol}`,
  });

  return updated;
}

export async function addReturnAttachment(
  orderId: string,
  attachment: { uri: string; name?: string }
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const rr = order.returnRequest;
  if (!rr) return order;

  const list = Array.isArray(rr.attachments) ? [...rr.attachments] : [];
  list.push({
    id: genId("att"),
    uri: String(attachment.uri),
    name: attachment.name,
    createdAt: nowISO(),
  });

  const updated: Order = { ...order, returnRequest: { ...rr, attachments: list } };
  await replaceOrder(updated);
  return updated;
}

// -----------------------------------------------------------------------------
// Review (telas review.tsx)
// -----------------------------------------------------------------------------

export async function setOrderReview(
  orderId: string,
  review: { stars: 1 | 2 | 3 | 4 | 5; comment?: string }
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = {
    ...order,
    review: {
      stars: review.stars,
      comment: review.comment,
      createdAt: nowISO(),
    },
  };

  await replaceOrder(updated);

  await addNotification({
    orderId,
    title: "Avaliação recebida",
    body: `Nota: ${updated.review?.stars} estrelas`,
  });

  return updated;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function replaceOrder(order: Order): Promise<void> {
  await ensureOrdersHydrated();
  const idx = ordersState.orders.findIndex((o) => o.id === order.id);
  if (idx === -1) {
    ordersState.orders = [normalizeOrder(order), ...ordersState.orders];
  } else {
    const normalized = normalizeOrder(order);
    ordersState.orders = [
      normalized,
      ...ordersState.orders.slice(0, idx),
      ...ordersState.orders.slice(idx + 1),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  await persistOrders();
}
