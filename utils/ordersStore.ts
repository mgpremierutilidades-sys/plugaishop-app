export type OrderStatus = "Confirmado" | "Pago" | "Enviado" | "Entregue";

export type OrderItem = {
  productId: string;
  qty: number;
  price: number;
  title: string;
};

export type OrderReview = {
  stars: number; // 1..5
  comment: string;
  updatedAt: string; // ISO
};

export type ReturnType = "Troca" | "Reembolso";
export type ReturnStatus = "Em análise" | "Aprovado" | "Recusado" | "Concluído";

export type ReturnAttachment = {
  id: string;
  uri: string;
  createdAt: string; // ISO
};

export type ReturnRequest = {
  protocol: string;
  type: ReturnType;
  reason: string;
  status: ReturnStatus;
  createdAt: string; // ISO
  attachments?: ReturnAttachment[];
};

export type OrderStatusEvent = {
  status: OrderStatus;
  at: string; // ISO
};

export type LogisticsEventType =
  | "POSTED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION";

export type LogisticsEvent = {
  id: string;
  at: string; // ISO
  type: LogisticsEventType;
  title: string;
  description?: string;
  location?: string;
};

export type InvoiceStatus = "AGUARDANDO" | "EMITIDA";

export type InvoiceInfo = {
  status: InvoiceStatus;
  issuedAt?: string; // ISO
  number?: string; // ex: "12345"
  series?: string; // ex: "1"
  accessKey?: string; // chave 44 dígitos (mock)
  danfeUrl?: string; // URL PDF (mock / backend)
};

export type Order = {
  id: string;
  createdAt: string; // ISO
  status: OrderStatus;
  discount: number;
  shipping: number;
  items: OrderItem[];

  statusHistory?: OrderStatusEvent[];

  trackingCode?: string;
  logisticsEvents?: LogisticsEvent[];

  invoice?: InvoiceInfo;

  review?: OrderReview;
  returnRequest?: ReturnRequest;
};

export type InAppNotificationType =
  | "ORDER_STATUS"
  | "ORDER_REVIEW"
  | "RETURN_REQUEST"
  | "LOGISTICS"
  | "INVOICE";

export type InAppNotification = {
  id: string;
  createdAt: string; // ISO
  type: InAppNotificationType;
  orderId?: string;
  title: string;
  body: string;
  read: boolean;
};

const ORDERS_KEY = "@plugaishop_orders_v3";
const NOTIFS_KEY = "@plugaishop_notifications_v1";

let memoryOrders: Order[] = [];
let memoryNotifs: InAppNotification[] = [];

async function getAsyncStorage() {
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    return mod?.default;
  } catch {
    return null;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function makeId() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${t}${r}`;
}

function makeProtocol() {
  const a = Date.now().toString(36).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PLG-${a}-${b}`;
}

function makeAccessKeyMock() {
  // 44 dígitos mock
  let s = "";
  while (s.length < 44) s += Math.floor(Math.random() * 10).toString();
  return s.slice(0, 44);
}

/* ---------------- ORDERS ---------------- */

export function createOrderFromCart(params: {
  items: { productId: string; qty: number; price: number; title: string }[];
  discount?: number;
  shipping?: number;
  status?: OrderStatus;
  createdAt?: string;
  id?: string;
}): Order {
  const createdAt = params.createdAt ?? nowISO();
  const status: OrderStatus = params.status ?? "Confirmado";

  return {
    id: params.id ?? makeId(),
    createdAt,
    status,
    discount: Number(params.discount ?? 0),
    shipping: Number(params.shipping ?? 0),
    items: (params.items ?? []).map((it) => ({
      productId: String(it.productId),
      qty: Math.max(1, Number(it.qty ?? 1)),
      price: Number(it.price ?? 0),
      title: String(it.title ?? "Produto"),
    })),
    statusHistory: [{ status, at: createdAt }],
    trackingCode: "",
    logisticsEvents: [],
    invoice: { status: "AGUARDANDO" },
  };
}

export async function listOrders(): Promise<Order[]> {
  const storage = await getAsyncStorage();
  if (!storage) return memoryOrders;

  try {
    const raw = await storage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveOrders(orders: Order[]): Promise<void> {
  const storage = await getAsyncStorage();
  if (!storage) {
    memoryOrders = orders;
    return;
  }

  try {
    await storage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    memoryOrders = orders;
  }
}

export async function addOrder(order: Order): Promise<void> {
  const current = await listOrders();
  const next = [order, ...current];
  await saveOrders(next);

  await addNotification({
    type: "ORDER_STATUS",
    orderId: order.id,
    title: `Pedido #${order.id} confirmado`,
    body: "Seu pedido foi registrado com sucesso.",
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const orders = await listOrders();
  return orders.find((o) => String(o.id) === String(id)) ?? null;
}

export async function updateOrderById(id: string, patch: Partial<Order>): Promise<Order | null> {
  const current = await listOrders();
  const idx = current.findIndex((o) => String(o.id) === String(id));
  if (idx < 0) return null;

  const updated: Order = {
    ...current[idx],
    ...patch,
    id: current[idx].id,
  };

  const next = [...current];
  next[idx] = updated;
  await saveOrders(next);
  return updated;
}

export function nextStatus(status: OrderStatus): OrderStatus {
  if (status === "Confirmado") return "Pago";
  if (status === "Pago") return "Enviado";
  if (status === "Enviado") return "Entregue";
  return "Entregue";
}

function ensureHistory(order: Order): OrderStatusEvent[] {
  const hist = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  if (hist.length > 0) return hist;

  const baseAt = order.createdAt ?? nowISO();
  return [{ status: order.status ?? "Confirmado", at: baseAt }];
}

export async function advanceOrderStatus(id: string): Promise<Order | null> {
  const order = await getOrderById(id);
  if (!order) return null;

  const newStatus = nextStatus(order.status);
  const at = nowISO();

  const history = ensureHistory(order);
  const already = history.some((h) => h.status === newStatus);
  const nextHistory = already ? history : [...history, { status: newStatus, at }];

  const updated = await updateOrderById(id, { status: newStatus, statusHistory: nextHistory });

  if (updated) {
    await addNotification({
      type: "ORDER_STATUS",
      orderId: updated.id,
      title: `Atualização do pedido #${updated.id}`,
      body: `Status atualizado para: ${updated.status}`,
    });
  }

  return updated;
}

export async function setOrderReview(id: string, stars: number, comment: string): Promise<Order | null> {
  const clamped = Math.max(1, Math.min(5, Number(stars || 0)));
  const updated = await updateOrderById(id, {
    review: { stars: clamped, comment: String(comment ?? ""), updatedAt: nowISO() },
  });

  if (updated) {
    await addNotification({
      type: "ORDER_REVIEW",
      orderId: updated.id,
      title: `Avaliação registrada (#${updated.id})`,
      body: `Obrigado! Você avaliou com ${clamped} estrela(s).`,
    });
  }

  return updated;
}

export async function createReturnRequest(id: string, type: ReturnType, reason: string): Promise<Order | null> {
  const updated = await updateOrderById(id, {
    returnRequest: {
      protocol: makeProtocol(),
      type,
      reason: String(reason ?? ""),
      status: "Em análise",
      createdAt: nowISO(),
      attachments: [],
    },
  });

  if (updated?.returnRequest) {
    await addNotification({
      type: "RETURN_REQUEST",
      orderId: updated.id,
      title: `Solicitação de ${updated.returnRequest.type} (#${updated.id})`,
      body: `Protocolo: ${updated.returnRequest.protocol} — Status: ${updated.returnRequest.status}`,
    });
  }

  return updated;
}

export async function addReturnAttachment(orderId: string, uri: string): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order || !order.returnRequest) return null;

  const attachments = Array.isArray(order.returnRequest.attachments)
    ? order.returnRequest.attachments
    : [];

  const next: ReturnAttachment[] = [
    { id: makeId(), uri: String(uri), createdAt: nowISO() },
    ...attachments,
  ];

  const updated = await updateOrderById(orderId, {
    returnRequest: { ...order.returnRequest, attachments: next },
  });

  return updated;
}

/* --------- TRACKING / LOGISTICS --------- */

export async function setTrackingCode(orderId: string, trackingCode: string): Promise<Order | null> {
  const code = String(trackingCode ?? "").trim();

  const updated = await updateOrderById(orderId, {
    trackingCode: code,
  });

  if (updated) {
    await addNotification({
      type: "LOGISTICS",
      orderId: updated.id,
      title: `Rastreio atualizado (#${updated.id})`,
      body: code ? `Código: ${code}` : "Código removido.",
    });
  }

  return updated;
}

export async function addLogisticsEvent(
  orderId: string,
  params: {
    type: LogisticsEventType;
    title: string;
    description?: string;
    location?: string;
    at?: string; // ISO
  }
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const current = Array.isArray(order.logisticsEvents) ? order.logisticsEvents : [];
  const event: LogisticsEvent = {
    id: makeId(),
    at: params.at ?? nowISO(),
    type: params.type,
    title: String(params.title ?? "Atualização logística"),
    description: params.description ? String(params.description) : undefined,
    location: params.location ? String(params.location) : undefined,
  };

  const next = [event, ...current];

  const updated = await updateOrderById(orderId, { logisticsEvents: next });

  if (updated) {
    await addNotification({
      type: "LOGISTICS",
      orderId: updated.id,
      title: `Atualização logística (#${updated.id})`,
      body: event.location ? `${event.title} • ${event.location}` : event.title,
    });
  }

  return updated;
}

export async function clearLogisticsEvents(orderId: string): Promise<Order | null> {
  return updateOrderById(orderId, { logisticsEvents: [] });
}

/* ---------------- INVOICE (mock + contract p/ Bling) ---------------- */

/**
 * CONTRATO (quando plugar backend):
 * - Seu app chamará GET https://<seu-backend>/orders/:id/invoice
 * - Backend consulta Bling e devolve:
 *   { status, issuedAt, number, series, accessKey, danfeUrl }
 *
 * IMPORTANTE:
 * - Token da Bling NUNCA no app.
 * - O app só consome a URL e metadados.
 */

export async function setInvoiceMock(orderId: string): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const issuedAt = nowISO();
  const invoice: InvoiceInfo = {
    status: "EMITIDA",
    issuedAt,
    number: String(Math.floor(10000 + Math.random() * 89999)),
    series: "1",
    accessKey: makeAccessKeyMock(),
    danfeUrl: `https://example.com/danfe/${encodeURIComponent(orderId)}.pdf`,
  };

  const updated = await updateOrderById(orderId, { invoice });

  if (updated) {
    await addNotification({
      type: "INVOICE",
      orderId: updated.id,
      title: `Nota Fiscal emitida (#${updated.id})`,
      body: `NF ${invoice.number} • Série ${invoice.series}`,
    });
  }

  return updated;
}

export async function clearInvoice(orderId: string): Promise<Order | null> {
  return updateOrderById(orderId, { invoice: { status: "AGUARDANDO" } });
}

/* ---------------- NOTIFICATIONS (in-app) ---------------- */

export async function listNotifications(): Promise<InAppNotification[]> {
  const storage = await getAsyncStorage();
  if (!storage) return memoryNotifs;

  try {
    const raw = await storage.getItem(NOTIFS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InAppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveNotifications(notifs: InAppNotification[]): Promise<void> {
  const storage = await getAsyncStorage();
  if (!storage) {
    memoryNotifs = notifs;
    return;
  }

  try {
    await storage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
  } catch {
    memoryNotifs = notifs;
  }
}

export async function addNotification(params: {
  type: InAppNotificationType;
  orderId?: string;
  title: string;
  body: string;
}): Promise<void> {
  const current = await listNotifications();
  const notif: InAppNotification = {
    id: makeId(),
    createdAt: nowISO(),
    type: params.type,
    orderId: params.orderId,
    title: params.title,
    body: params.body,
    read: false,
  };
  const next = [notif, ...current];
  await saveNotifications(next);
}

export async function markNotificationRead(id: string): Promise<void> {
  const current = await listNotifications();
  const next = current.map((n) => (String(n.id) === String(id) ? { ...n, read: true } : n));
  await saveNotifications(next);
}

export async function markAllNotificationsRead(): Promise<void> {
  const current = await listNotifications();
  const next = current.map((n) => ({ ...n, read: true }));
  await saveNotifications(next);
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const items = await listNotifications();
  return (items ?? []).filter((n) => !n.read).length;
}

export async function clearNotifications(): Promise<void> {
  const storage = await getAsyncStorage();
  if (!storage) {
    memoryNotifs = [];
    return;
  }
  try {
    await storage.removeItem(NOTIFS_KEY);
  } catch {
    memoryNotifs = [];
  }
}

export async function clearOrders(): Promise<void> {
  const storage = await getAsyncStorage();
  if (!storage) {
    memoryOrders = [];
    return;
  }
  try {
    await storage.removeItem(ORDERS_KEY);
  } catch {
    memoryOrders = [];
  }
}
