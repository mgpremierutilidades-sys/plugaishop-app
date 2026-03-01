import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LogisticsEvent, LogisticsEventType, Order } from "../../../types/order";

const KEY = "@plugaishop:orders";

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
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

  const items = Array.isArray(input.items) ? (input.items as any[]) : [];

  const status = toString(input.status, "created") as Order["status"];
  const timeline = Array.isArray(input.timeline) ? (input.timeline as any[]) : [];
  const createdAt = toISODate(input.createdAt);

  const address = isObject(input.address) ? (input.address as any) : undefined;
  const payment = isObject(input.payment) ? (input.payment as any) : undefined;
  const note = typeof input.note === "string" ? input.note : undefined;

  // Tracking (opcional)
  const trackingCode = typeof input.trackingCode === "string" ? input.trackingCode : undefined;
  const logisticsEvents = Array.isArray(input.logisticsEvents) ? (input.logisticsEvents as any[]) : undefined;

  const normalized: Order = {
    id,
    items: items as any,
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
    logisticsEvents: logisticsEvents as any,
  };

  return normalized;
}

export async function listOrders(): Promise<Order[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];

  const parsed = safeJsonParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  const normalized = parsed
    .map((it) => normalizeOrder(it))
    .filter((it): it is Order => it !== null);

  if (normalized.length !== parsed.length) {
    await setOrders(normalized);
  }

  return normalized;
}

export async function setOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(orders));
}

export async function addOrder(order: Order): Promise<void> {
  const normalized = normalizeOrder(order) ?? order;
  const current = await listOrders();
  const next = [normalized, ...current];
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
function makeId(prefix = "lg") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

export async function setTrackingCode(orderId: string, trackingCode: string): Promise<Order | null> {
  const o = await getOrderById(orderId);
  if (!o) return null;

  const next: Order = {
    ...o,
    trackingCode: String(trackingCode ?? "").trim(),
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
    at: event.at ?? new Date().toISOString(),
  };

  const current = Array.isArray(o.logisticsEvents) ? o.logisticsEvents : [];
  const next: Order = {
    ...o,
    logisticsEvents: [ev, ...current],
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