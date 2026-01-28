// utils/ordersStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ORDERS_STORAGE_KEY = "plugaishop.orders.v1" as const;
const NOTIFICATIONS_STORAGE_KEY = "plugaishop.orders.notifications.v1" as const;

/**
 * Status canônico do pedido (use esses literais no app).
 * Se em algum lugar você usa "Confirmado", normalize para "confirmed".
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "canceled";

export type PaymentMethod = "pix" | "card" | "boleto" | "cash" | "wallet" | "unknown";

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
  image?: any; // compatível com require(...) / ImageSource no RN
};

export type OrderStatusHistoryItem = {
  status: OrderStatus;
  at: string; // ISO
};

/**
 * Nota fiscal (mock/local)
 * (inclui campos que suas telas acessam)
 */
export type InvoiceStatus = "AGUARDANDO" | "EMITIDA" | "CANCELADA";

export type Invoice = {
  status: InvoiceStatus;
  danfeUrl?: string;
  accessKey?: string;
  issuedAt?: string; // ISO

  // campos adicionais usados pela UI
  number?: string;
  series?: string;
};

/**
 * Troca / Devolução (mock/local)
 */
export type ReturnType = "Troca" | "Reembolso";
export type ReturnStatus = "Solicitado" | "Em análise" | "Aprovado" | "Negado" | "Concluído";

export type ReturnAttachment = { uri: string; name?: string };

export type ReturnRequest = {
  type: ReturnType;
  status: ReturnStatus;
  protocol: string;
  reason?: string;
  createdAt: string; // ISO
  attachments?: ReturnAttachment[];
};

/** Avaliação (mock/local) */
export type OrderReview = {
  stars: number; // 1..5
  comment?: string;
  createdAt: string; // ISO
};

/**
 * Rastreamento (mock/local)
 * (sua UI usa at/location; mantemos compat + createdAt + title)
 */
export type LogisticsEventType =
  | "POSTED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION";

export type LogisticsEvent = {
  id: string;
  type: LogisticsEventType;

  // usado pela sua UI atual
  title: string;
  description?: string;
  location?: string;

  // compat: algumas telas usam "at"
  at?: string; // ISO

  // canônico
  createdAt: string; // ISO
};

export type InAppNotificationType =
  | "ORDER_STATUS"
  | "INVOICE"
  | "TRACKING"
  | "RETURN"
  | "REVIEW"
  | "GENERIC";

export type InAppNotification = {
  id: string;
  type: InAppNotificationType;
  title: string;
  body?: string;
  createdAt: string; // ISO
  read: boolean;
  orderId?: string;
};

export type Order = {
  id: string;
  createdAt: string; // ISO string
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount?: number; // valor absoluto
  shipping?: number; // valor absoluto
  total: number;
  paymentMethod?: PaymentMethod;
  address?: Address;

  // extras
  notes?: string;
  trackingCode?: string;

  // extras que suas telas já usam
  statusHistory?: OrderStatusHistoryItem[];
  invoice?: Invoice;
  returnRequest?: ReturnRequest;
  review?: OrderReview;
  logisticsEvents?: LogisticsEvent[];
};

type OrdersState = {
  hydrated: boolean;
  orders: Order[];
  notificationsHydrated: boolean;
  notifications: InAppNotification[];
};

const state: OrdersState = {
  hydrated: false,
  orders: [],
  notificationsHydrated: false,
  notifications: [],
};

let hydratePromise: Promise<void> | null = null;
let hydrateNotificationsPromise: Promise<void> | null = null;

function safeNumber(n: unknown, fallback = 0) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function computeTotals(items: OrderItem[], discount?: number, shipping?: number) {
  const subtotal = items.reduce((acc, it) => acc + safeNumber(it.price) * safeNumber(it.qty), 0);
  const d = safeNumber(discount, 0);
  const s = safeNumber(shipping, 0);
  const total = Math.max(0, subtotal - d + s);
  return { subtotal, total };
}

function genId(prefix = "ord") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

async function persistOrders() {
  await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(state.orders));
}

async function persistNotifications() {
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications));
}

function normalizeStatus(rawStatus: any): OrderStatus {
  const s = String(rawStatus ?? "pending").toLowerCase();

  if (s === "confirmado" || s === "confirmed") return "confirmed";
  if (s === "pago" || s === "paid") return "paid";
  if (s === "processando" || s === "processing") return "processing";
  if (s === "enviado" || s === "shipped") return "shipped";
  if (s === "entregue" || s === "delivered") return "delivered";
  if (s === "cancelado" || s === "canceled") return "canceled";
  if (s === "pendente" || s === "pending") return "pending";

  return "pending";
}

/** Export que sua UI está pedindo */
export function normalizeStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "confirmed":
      return "Confirmado";
    case "paid":
      return "Pago";
    case "processing":
      return "Processando";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    case "canceled":
      return "Cancelado";
    default:
      return "Pendente";
  }
}

/** Export que sua UI está pedindo */
export function getTrackingUrl(trackingCode?: string): string | null {
  const code = String(trackingCode ?? "").trim();
  if (!code) return null;

  // Correios (padrão BR). Se você usar transportadora, ajustamos depois.
  return `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objetos=${encodeURIComponent(code)}`;
}

/** Export que sua UI está pedindo */
export function buildOrderSupportText(order?: Order | null): string {
  if (!order) return "Olá! Preciso de ajuda com um pedido, mas não encontrei os detalhes.";
  const lines: string[] = [];
  lines.push("Olá! Preciso de ajuda com o meu pedido.");
  lines.push(`Pedido: ${order.id}`);
  lines.push(`Status: ${normalizeStatusLabel(order.status)}`);
  lines.push(`Data: ${new Date(order.createdAt).toLocaleString()}`);
  if (order.trackingCode) lines.push(`Rastreio: ${order.trackingCode}`);
  lines.push("");
  lines.push("Detalhes:");
  for (const it of order.items ?? []) {
    lines.push(`- ${it.title} (x${it.qty})`);
  }
  lines.push("");
  lines.push("Obrigado.");
  return lines.join("\n");
}

function normalizeOrder(raw: any): Order {
  const items: OrderItem[] = Array.isArray(raw?.items)
    ? raw.items.map((it: any) => ({
        productId: String(it?.productId ?? ""),
        title: String(it?.title ?? ""),
        price: safeNumber(it?.price, 0),
        qty: Math.max(1, safeNumber(it?.qty, 1)),
        image: it?.image,
      }))
    : [];

  const discount = raw?.discount == null ? undefined : safeNumber(raw.discount, 0);
  const shipping = raw?.shipping == null ? undefined : safeNumber(raw.shipping, 0);
  const totals = computeTotals(items, discount, shipping);

  const status = normalizeStatus(raw?.status);

  const statusHistory: OrderStatusHistoryItem[] | undefined = Array.isArray(raw?.statusHistory)
    ? raw.statusHistory
        .map((h: any) => ({
          status: normalizeStatus(h?.status),
          at: String(h?.at ?? h?.date ?? new Date().toISOString()),
        }))
        .filter((h: any) => !!h?.status && !!h?.at)
    : undefined;

  const logisticsEvents: LogisticsEvent[] | undefined = Array.isArray(raw?.logisticsEvents)
    ? raw.logisticsEvents
        .map((e: any) => {
          const createdAt = String(e?.createdAt ?? e?.at ?? new Date().toISOString());
          return {
            id: String(e?.id ?? genId("trk")),
            type: String(e?.type ?? "IN_TRANSIT") as LogisticsEventType,
            title: String(e?.title ?? e?.name ?? "Atualização"),
            description: e?.description ?? e?.details,
            location: e?.location,
            at: String(e?.at ?? createdAt),
            createdAt,
          };
        })
        .filter((e: any) => !!e?.id && !!e?.type)
    : undefined;

  const invoice: Invoice | undefined =
    raw?.invoice && typeof raw.invoice === "object"
      ? {
          status: (raw.invoice.status ?? "AGUARDANDO") as InvoiceStatus,
          danfeUrl: raw.invoice.danfeUrl,
          accessKey: raw.invoice.accessKey,
          issuedAt: raw.invoice.issuedAt,
          number: raw.invoice.number,
          series: raw.invoice.series,
        }
      : undefined;

  const returnRequest: ReturnRequest | undefined =
    raw?.returnRequest && typeof raw.returnRequest === "object"
      ? {
          type: (raw.returnRequest.type ?? "Troca") as ReturnType,
          status: (raw.returnRequest.status ?? "Solicitado") as ReturnStatus,
          protocol: String(raw.returnRequest.protocol ?? genId("RET")),
          reason: raw.returnRequest.reason,
          createdAt: String(raw.returnRequest.createdAt ?? new Date().toISOString()),
          attachments: Array.isArray(raw.returnRequest.attachments)
            ? raw.returnRequest.attachments.map((a: any) => ({
                uri: String(a?.uri ?? ""),
                name: a?.name,
              }))
            : undefined,
        }
      : undefined;

  const review: OrderReview | undefined =
    raw?.review && typeof raw.review === "object"
      ? {
          stars: Math.min(5, Math.max(1, safeNumber(raw.review.stars, 5))),
          comment: raw.review.comment ?? "",
          createdAt: String(raw.review.createdAt ?? new Date().toISOString()),
        }
      : undefined;

  return {
    id: String(raw?.id ?? genId()),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    status,
    items,
    subtotal: safeNumber(raw?.subtotal, totals.subtotal),
    discount,
    shipping,
    total: safeNumber(raw?.total, totals.total),
    paymentMethod: (raw?.paymentMethod ?? "unknown") as PaymentMethod,
    address: raw?.address,
    notes: raw?.notes,
    trackingCode: raw?.trackingCode,
    statusHistory,
    invoice,
    returnRequest,
    review,
    logisticsEvents,
  };
}

function sortNewestFirst(a: Order, b: Order) {
  return a.createdAt < b.createdAt ? 1 : -1;
}

/**
 * Carrega pedidos do AsyncStorage para a memória (uma vez).
 */
export async function ensureOrdersHydrated(): Promise<void> {
  if (state.hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const json = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      const parsed = json ? JSON.parse(json) : null;

      if (Array.isArray(parsed)) {
        state.orders = parsed.map(normalizeOrder).sort(sortNewestFirst);
      } else {
        state.orders = [];
      }

      state.hydrated = true;
    } catch {
      state.orders = [];
      state.hydrated = true;
    }
  })();

  return hydratePromise;
}

/**
 * Carrega notificações internas (uma vez).
 * Export requerido pela UI.
 */
export async function ensureNotificationsHydrated(): Promise<void> {
  if (state.notificationsHydrated) return;
  if (hydrateNotificationsPromise) return hydrateNotificationsPromise;

  hydrateNotificationsPromise = (async () => {
    try {
      const json = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const parsed = json ? JSON.parse(json) : null;

      if (Array.isArray(parsed)) {
        state.notifications = parsed
          .map((n: any) => ({
            id: String(n?.id ?? genId("NOTIF")),
            type: (n?.type ?? "GENERIC") as InAppNotificationType,
            title: String(n?.title ?? "Atualização"),
            body: n?.body,
            createdAt: String(n?.createdAt ?? new Date().toISOString()),
            read: !!n?.read,
            orderId: n?.orderId ? String(n.orderId) : undefined,
          }))
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      } else {
        state.notifications = [];
      }

      state.notificationsHydrated = true;
    } catch {
      state.notifications = [];
      state.notificationsHydrated = true;
    }
  })();

  return hydrateNotificationsPromise;
}

export async function getOrders(): Promise<Order[]> {
  await ensureOrdersHydrated();
  return [...state.orders];
}

/** Alias esperado por arquivos: listOrders() */
export async function listOrders(): Promise<Order[]> {
  return getOrders();
}

/** Alias esperado por hooks: saveOrders() */
export async function saveOrders(orders: Order[]): Promise<void> {
  await setOrders(orders);
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  await ensureOrdersHydrated();
  return state.orders.find((o) => o.id === id);
}

export type CreateOrderInput = {
  items: OrderItem[];
  discount?: number;
  shipping?: number;
  paymentMethod?: PaymentMethod;
  address?: Address;
  status?: OrderStatus; // default: confirmed (pós-success)
  notes?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  await ensureOrdersHydrated();

  const items = Array.isArray(input.items) ? input.items : [];
  const discount = input.discount == null ? undefined : safeNumber(input.discount, 0);
  const shipping = input.shipping == null ? undefined : safeNumber(input.shipping, 0);
  const totals = computeTotals(items, discount, shipping);

  const now = new Date().toISOString();
  const status = input.status ?? "confirmed";

  const order: Order = {
    id: genId(),
    createdAt: now,
    status,
    items,
    subtotal: totals.subtotal,
    discount,
    shipping,
    total: totals.total,
    paymentMethod: input.paymentMethod ?? "unknown",
    address: input.address,
    notes: input.notes,
    statusHistory: [{ status, at: now }],
  };

  state.orders = [order, ...state.orders].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "ORDER_STATUS",
    title: "Pedido confirmado",
    body: "Seu pedido foi registrado com sucesso.",
    orderId: order.id,
  });

  return order;
}

export type CreateOrderFromCartInput = {
  items: { productId: string; title: string; price: number; qty: number; image?: any }[];
  discount?: number;
  shipping?: number;
  paymentMethod?: PaymentMethod;
  address?: Address;
  notes?: string;
  status?: OrderStatus;
};

export async function createOrderFromCart(input: CreateOrderFromCartInput): Promise<Order> {
  await ensureOrdersHydrated();

  const items: OrderItem[] = Array.isArray(input.items)
    ? input.items.map((it) => ({
        productId: String(it.productId),
        title: String(it.title),
        price: safeNumber(it.price, 0),
        qty: Math.max(1, safeNumber(it.qty, 1)),
        image: it.image,
      }))
    : [];

  const discount = input.discount == null ? undefined : safeNumber(input.discount, 0);
  const shipping = input.shipping == null ? undefined : safeNumber(input.shipping, 0);
  const totals = computeTotals(items, discount, shipping);

  const now = new Date().toISOString();
  const status = input.status ?? "confirmed";

  return {
    id: genId(),
    createdAt: now,
    status,
    items,
    subtotal: totals.subtotal,
    discount,
    shipping,
    total: totals.total,
    paymentMethod: input.paymentMethod ?? "unknown",
    address: input.address,
    notes: input.notes,
    statusHistory: [{ status, at: now }],
  };
}

export async function addOrder(order: Order): Promise<void> {
  await ensureOrdersHydrated();

  const normalized = normalizeOrder(order);
  if (!normalized.statusHistory?.length) {
    normalized.statusHistory = [{ status: normalized.status, at: normalized.createdAt }];
  }

  state.orders = [normalized, ...state.orders.filter((o) => o.id !== normalized.id)].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "ORDER_STATUS",
    title: normalized.status === "confirmed" ? "Pedido confirmado" : "Pedido atualizado",
    body: "Você pode acompanhar em “Pedidos”.",
    orderId: normalized.id,
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | undefined> {
  await ensureOrdersHydrated();

  const idx = state.orders.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;

  const now = new Date().toISOString();
  const prev = state.orders[idx];

  const history = Array.isArray(prev.statusHistory) ? [...prev.statusHistory] : [];
  if (!history.some((h) => h.status === status)) history.push({ status, at: now });

  const updated: Order = { ...prev, status, statusHistory: history };

  state.orders = [updated, ...state.orders.slice(0, idx), ...state.orders.slice(idx + 1)].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "ORDER_STATUS",
    title: "Status do pedido atualizado",
    body: `Novo status: ${normalizeStatusLabel(status)}`,
    orderId: updated.id,
  });

  return updated;
}

export async function advanceOrderStatus(id: string): Promise<Order | undefined> {
  const order = await getOrderById(id);
  if (!order) return undefined;

  const next: Record<OrderStatus, OrderStatus> = {
    pending: "confirmed",
    confirmed: "paid",
    paid: "processing",
    processing: "shipped",
    shipped: "delivered",
    delivered: "delivered",
    canceled: "canceled",
  };

  return updateOrderStatus(id, next[order.status] ?? order.status);
}

export async function clearOrders(): Promise<void> {
  state.orders = [];
  state.hydrated = true;
  hydratePromise = null;
  await AsyncStorage.removeItem(ORDERS_STORAGE_KEY);
}

export async function setOrders(orders: Order[]): Promise<void> {
  state.orders = Array.isArray(orders) ? orders.map(normalizeOrder).sort(sortNewestFirst) : [];
  state.hydrated = true;
  hydratePromise = null;
  await persistOrders();
}

/* -----------------------------
 * Nota fiscal (mock)
 * ----------------------------- */

export async function setInvoiceMock(orderId: string, invoice?: Invoice): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const inv: Invoice =
    invoice ??
    ({
      status: "AGUARDANDO",
      danfeUrl: "https://example.com/danfe.pdf",
      accessKey: `${Math.random().toString().slice(2, 14)}${Math.random().toString().slice(2, 14)}`.slice(0, 44),
      issuedAt: new Date().toISOString(),
      number: "000000123",
      series: "1",
    } as Invoice);

  const updated: Order = { ...order, invoice: inv };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "INVOICE",
    title: inv.status === "EMITIDA" ? "Nota fiscal emitida" : "Nota fiscal em processamento",
    body: "Acompanhe os detalhes no seu pedido.",
    orderId,
  });

  return updated;
}

export async function clearInvoice(orderId: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order };
  delete updated.invoice;

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();
  return updated;
}

/* -----------------------------
 * Troca / Devolução (mock)
 * ----------------------------- */

export async function createReturnRequest(orderId: string, type: ReturnType, reason?: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const req: ReturnRequest = {
    type,
    status: "Solicitado",
    protocol: genId("RET"),
    reason,
    createdAt: new Date().toISOString(),
    attachments: [],
  };

  const updated: Order = { ...order, returnRequest: req };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "RETURN",
    title: "Solicitação registrada",
    body: `Sua solicitação de ${type.toLowerCase()} foi aberta.`,
    orderId,
  });

  return updated;
}

export async function addReturnAttachment(
  orderId: string,
  file: string | { uri: string; name?: string }
): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order?.returnRequest) return null;

  const att: ReturnAttachment =
    typeof file === "string" ? { uri: file, name: "anexo.jpg" } : { uri: file.uri, name: file.name };

  const prev = order.returnRequest;
  const attachments = Array.isArray(prev.attachments) ? [...prev.attachments] : [];
  attachments.push(att);

  const updated: Order = {
    ...order,
    returnRequest: { ...prev, attachments },
  };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();
  return updated;
}

/* -----------------------------
 * Avaliação (mock)
 * ----------------------------- */

export async function setOrderReview(orderId: string, stars: number, comment?: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const review: OrderReview = {
    stars: Math.min(5, Math.max(1, safeNumber(stars, 5))),
    comment: comment ?? "",
    createdAt: new Date().toISOString(),
  };

  const updated: Order = { ...order, review };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "REVIEW",
    title: "Avaliação recebida",
    body: "Obrigado por avaliar sua compra.",
    orderId,
  });

  return updated;
}

/* -----------------------------
 * Rastreamento (mock)
 * ----------------------------- */

export async function setTrackingCode(orderId: string, code: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order, trackingCode: String(code ?? "") };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();

  await pushNotification({
    type: "TRACKING",
    title: "Código de rastreio atualizado",
    body: "Acompanhe o envio na aba Rastreamento.",
    orderId,
  });

  return updated;
}

export async function addLogisticsEvent(
  orderId: string,
  type: LogisticsEventType,
  title?: string,
  description?: string,
  location?: string
): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const createdAt = new Date().toISOString();

  const list = Array.isArray(order.logisticsEvents) ? [...order.logisticsEvents] : [];
  list.unshift({
    id: genId("TRK"),
    type,
    title: title ?? "Atualização de rastreio",
    description,
    location,
    at: createdAt,
    createdAt,
  });

  const updated: Order = { ...order, logisticsEvents: list };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();
  return updated;
}

export async function clearLogisticsEvents(orderId: string): Promise<Order | null> {
  await ensureOrdersHydrated();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const updated: Order = { ...order, logisticsEvents: [] };

  state.orders = [updated, ...state.orders.filter((o) => o.id !== orderId)].sort(sortNewestFirst);
  await persistOrders();
  return updated;
}

/* -----------------------------
 * Notificações internas
 * ----------------------------- */

async function pushNotification(input: Omit<InAppNotification, "id" | "createdAt" | "read">) {
  await ensureNotificationsHydrated();

  const n: InAppNotification = {
    id: genId("NOTIF"),
    type: input.type,
    title: input.title,
    body: input.body,
    orderId: input.orderId,
    createdAt: new Date().toISOString(),
    read: false,
  };

  state.notifications = [n, ...state.notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  await persistNotifications();
}

export async function listNotifications(): Promise<InAppNotification[]> {
  await ensureNotificationsHydrated();
  return [...state.notifications];
}

export async function markNotificationRead(id: string): Promise<void> {
  await ensureNotificationsHydrated();
  const idx = state.notifications.findIndex((n) => n.id === id);
  if (idx === -1) return;

  const updated = { ...state.notifications[idx], read: true };
  state.notifications = [updated, ...state.notifications.slice(0, idx), ...state.notifications.slice(idx + 1)].sort(
    (a, b) => (a.createdAt < b.createdAt ? 1 : -1)
  );

  await persistNotifications();
}

export async function markAllNotificationsRead(): Promise<void> {
  await ensureNotificationsHydrated();
  state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
  await persistNotifications();
}

export async function getUnreadNotificationsCount(): Promise<number> {
  await ensureNotificationsHydrated();
  return state.notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
}
