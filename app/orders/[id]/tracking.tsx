// store/orders/orders-storage.ts (ajuste o caminho conforme seu repo)
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  LogisticsEvent,
  LogisticsEventType,
  Order,
} from "../../../types/order";

const KEY = "@plugaishop:orders";

// ---------------------------
// Utils
// ---------------------------
type UnknownRecord = Record<string, unknown>;

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isObject(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toISODate(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  const d = s ? new Date(s) : new Date();
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

function isLogisticsEventType(v: unknown): v is LogisticsEventType {
  // best-effort: LogisticsEventType normalmente é union de string.
  return typeof v === "string" && v.trim().length > 0;
}

function makeId(prefix = "lg") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

// ---------------------------
// Normalizers (defensivos)
// ---------------------------
function normalizeLogisticsEvent(input: unknown): LogisticsEvent | null {
  if (!isObject(input)) return null;

  const id = toString(input.id) || makeId("lg");
  const typeRaw = input.type;
  if (!isLogisticsEventType(typeRaw)) return null;

  return {
    id,
    type: typeRaw,
    title: typeof input.title === "string" ? input.title : undefined,
    description: typeof input.description === "string" ? input.description : undefined,
    location: typeof input.location === "string" ? input.location : undefined,
    at: toISODate(input.at),
  };
}

function normalizeOrder(input: unknown): Order | null {
  if (!isObject(input)) return null;

  const id = toString(input.id);
  if (!id) return null;

  const subtotal = toNumber(input.subtotal, 0);
  const discount = toNumber(input.discount, 0);

  const shippingObj = isObject(input.shipping) ? input.shipping : null;
  const shipping = shippingObj
    ? {
        method: toString(shippingObj.method),
        price: toNumber(shippingObj.price, 0),
        deadline: toString(shippingObj.deadline),
      }
    : undefined;

  const computedTotal = Math.max(0, subtotal - discount + (shipping?.price ?? 0));
  const totalRaw = typeof input.total === "number" ? input.total : Number(input.total);
  const total = Number.isFinite(totalRaw) ? totalRaw : computedTotal;

  const items = Array.isArray(input.items) ? (input.items as Order["items"]) : ([] as any);

  const status = toString(input.status, "created") as Order["status"];
  const timeline = Array.isArray(input.timeline) ? (input.timeline as Order["timeline"]) : ([] as any);
  const createdAt = toISODate(input.createdAt);

  const address = isObject(input.address) ? (input.address as Order["address"]) : undefined;
  const payment = isObject(input.payment) ? (input.payment as Order["payment"]) : undefined;
  const note = typeof input.note === "string" ? input.note : undefined;

  const trackingCode = typeof input.trackingCode === "string" ? input.trackingCode.trim() : undefined;

  const logisticsEventsRaw = Array.isArray(input.logisticsEvents) ? input.logisticsEvents : undefined;
  const logisticsEvents = logisticsEventsRaw
    ? logisticsEventsRaw
        .map((e) => normalizeLogisticsEvent(e))
        .filter((e): e is LogisticsEvent => e !== null)
    : undefined;

  const normalized: Order = {
    id,
    items,
    subtotal,
    discount,
    shipping,
    total,
    address,
    payment,
    note,
    status,
    timeline,
    createdAt,
    trackingCode,
    logisticsEvents,
  };

  return normalized;
}

function dedupeById(orders: Order[]): Order[] {
  const seen = new Set<string>();
  const out: Order[] = [];
  for (const o of orders) {
    if (!o?.id || seen.has(o.id)) continue;
    seen.add(o.id);
    out.push(o);
  }
  return out;
}

// ---------------------------
// Storage API
// ---------------------------
export async function listOrders(): Promise<Order[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];

  const parsed = safeJsonParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  const normalized = parsed
    .map((it) => normalizeOrder(it))
    .filter((it): it is Order => it !== null);

  const deduped = dedupeById(normalized);

  // Se normalização removeu lixo/duplicado, persistir versão limpa
  if (deduped.length !== parsed.length || deduped.length !== normalized.length) {
    await setOrders(deduped);
  }

  return deduped;
}

export async function setOrders(orders: Order[]): Promise<void> {
  const safe = dedupeById(
    orders.map((o) => normalizeOrder(o) ?? o).filter(Boolean) as Order[],
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(safe));
}

export async function addOrder(order: Order): Promise<void> {
  const normalized = normalizeOrder(order) ?? order;
  const current = await listOrders();

  // upsert (se já existir, substitui)
  const next = dedupeById([normalized, ...current.filter((o) => o.id !== normalized.id)]);
  await setOrders(next);
}

export async function clearOrders(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const orders = await listOrders();
  return orders.find((o) => o.id === id) ?? null;
}

export async function updateOrder(order: Order): Promise<void> {
  const normalized = normalizeOrder(order) ?? order;
  const orders = await listOrders();
  const next = orders.map((o) => (o.id === normalized.id ? normalized : o));
  await setOrders(next);
}

// ---------------------------
// Tracking helpers (V1 stub)
// ---------------------------
export async function setTrackingCode(orderId: string, trackingCode: string): Promise<Order | null> {
  const o = await getOrderById(orderId);
  if (!o) return null;

  const next: Order = {
    ...o,
    trackingCode: String(trackingCode ?? "").trim() || undefined,
  };

  await updateOrder(next);
  return next;
}

export async function addLogisticsEvent(
  orderId: string,
  event: {
    type: LogisticsEventType;
    title?: string;
    description?: string;
    location?: string;
    at?: string; // opcional; se não vier, now()
  },
): Promise<Order | null> {
  const o = await getOrderById(orderId);
  if (!o) return null;

  const ev: LogisticsEvent = {
    id: makeId("lg"),
    type: event.type,
    title: event.title,
    description: event.description,
    location: event.location,
    at: toISODate(event.at),
  };

  const current = Array.isArray(o.logisticsEvents) ? o.logisticsEvents : [];

  // dedupe por id e limita tamanho (evita crescimento infinito)
  const nextEvents = [ev, ...current.filter((e) => e?.id !== ev.id)].slice(0, 100);

  const next: Order = {
    ...o,
    logisticsEvents: nextEvents,
  };

  await updateOrder(next);
  return next;
}

export async function clearLogisticsEvents(orderId: string): Promise<Order | null> {
  const o = await getOrderById(orderId);
  if (!o) return null;

  const next: Order = {
    ...o,
    logisticsEvents: [],
  };

  await updateOrder(next);
  return next;
}