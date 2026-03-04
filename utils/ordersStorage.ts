// utils/ordersStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LogisticsEvent, LogisticsEventType, Order } from "../types/order";

const KEY = "@plugaishop:orders";

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
  return typeof v === "string" && v.trim().length > 0;
}

function makeId(prefix = "lg") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

// ✅ garante string ISO válida e sempre retorna string
function safeAt(v: unknown): string {
  return toISODate(v);
}

function normalizeLogisticsEvent(input: unknown): LogisticsEvent | null {
  if (!isObject(input)) return null;

  const typeRaw = (input as any).type;
  if (!isLogisticsEventType(typeRaw)) return null;

  return {
    id: toString((input as any).id) || makeId("lg"),
    type: typeRaw,
    title: typeof (input as any).title === "string" ? (input as any).title : undefined,
    description: typeof (input as any).description === "string" ? (input as any).description : undefined,
    location: typeof (input as any).location === "string" ? (input as any).location : undefined,
    at: safeAt((input as any).at), // ✅ sempre string
  };
}

function normalizeOrder(input: unknown): Order | null {
  if (!isObject(input)) return null;

  const id = toString((input as any).id);
  if (!id) return null;

  const subtotal = toNumber((input as any).subtotal, 0);
  const discount = toNumber((input as any).discount, 0);

  const shippingObj = isObject((input as any).shipping) ? ((input as any).shipping as UnknownRecord) : null;
  const shipping = shippingObj
    ? {
        method: toString(shippingObj.method),
        price: toNumber(shippingObj.price, 0),
        deadline: toString(shippingObj.deadline),
      }
    : undefined;

  const computedTotal = Math.max(0, subtotal - discount + (shipping?.price ?? 0));
  const totalRaw =
    typeof (input as any).total === "number" ? (input as any).total : Number((input as any).total);
  const total = Number.isFinite(totalRaw) ? totalRaw : computedTotal;

  const items = Array.isArray((input as any).items) ? ((input as any).items as Order["items"]) : ([] as any);

  const status = toString((input as any).status, "created") as Order["status"];
  const timeline = Array.isArray((input as any).timeline)
    ? ((input as any).timeline as Order["timeline"])
    : ([] as any);
  const createdAt = safeAt((input as any).createdAt);

  const address = isObject((input as any).address) ? ((input as any).address as Order["address"]) : undefined;
  const payment = isObject((input as any).payment) ? ((input as any).payment as Order["payment"]) : undefined;
  const note = typeof (input as any).note === "string" ? (input as any).note : undefined;

  const trackingCode =
    typeof (input as any).trackingCode === "string" ? (input as any).trackingCode.trim() || undefined : undefined;

  const logisticsEventsRaw = Array.isArray((input as any).logisticsEvents) ? (input as any).logisticsEvents : undefined;
  const logisticsEvents = logisticsEventsRaw
    ? (logisticsEventsRaw as unknown[])
        .map((e) => normalizeLogisticsEvent(e))
        .filter((e): e is LogisticsEvent => e !== null)
        // ✅ evita TS18048: trata at indefinido defensivamente
        .sort((a, b) => (safeAt(a.at) < safeAt(b.at) ? 1 : -1))
    : undefined;

  return {
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

export async function listOrders(): Promise<Order[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];

  const parsed = safeJsonParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  const normalized = (parsed as unknown[])
    .map((it) => normalizeOrder(it))
    .filter((it): it is Order => it !== null);

  const deduped = dedupeById(normalized);

  if (deduped.length !== (parsed as unknown[]).length || deduped.length !== normalized.length) {
    await setOrders(deduped);
  }

  return deduped;
}

export async function setOrders(orders: Order[]): Promise<void> {
  const safe = dedupeById(orders.map((o) => normalizeOrder(o) ?? o).filter(Boolean) as Order[]);
  await AsyncStorage.setItem(KEY, JSON.stringify(safe));
}

export async function addOrder(order: Order): Promise<void> {
  const normalized = normalizeOrder(order) ?? order;
  const current = await listOrders();
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

  const trimmed = String(trackingCode ?? "").trim();
  const next: Order = { ...o, trackingCode: trimmed.length ? trimmed : undefined };

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
    at?: string;
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
    at: safeAt(event.at),
  };

  const current = Array.isArray(o.logisticsEvents) ? o.logisticsEvents : [];
  const nextEvents = [ev, ...current.filter((e) => e?.id !== ev.id)].slice(0, 120);

  const next: Order = { ...o, logisticsEvents: nextEvents };
  await updateOrder(next);
  return next;
}

export async function clearLogisticsEvents(orderId: string): Promise<Order | null> {
  const o = await getOrderById(orderId);
  if (!o) return null;

  const next: Order = { ...o, logisticsEvents: [] };
  await updateOrder(next);
  return next;
}