import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Order } from "../types/order";

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

/**
 * Mantém o storage resiliente a versões antigas/estranhas do JSON.
 * `changed` é setado quando aplicamos defaults/correções.
 */
function normalizeOrder(input: unknown): { order: Order | null; changed: boolean } {
  if (!isObject(input)) return { order: null, changed: false };

  let changed = false;

  const id = toString(input.id);
  if (!id) return { order: null, changed: false };

  const subtotal = toNumber(input.subtotal, 0);
  if (input.subtotal !== subtotal) changed = true;

  const discount = toNumber(input.discount, 0);
  if (input.discount !== discount) changed = true;

  const shippingObj = isObject(input.shipping) ? input.shipping : null;
  const shipping = shippingObj
    ? {
        method: toString(shippingObj.method),
        price: toNumber(shippingObj.price, 0),
        deadline: toString(shippingObj.deadline),
      }
    : undefined;

  // Se vier shipping inválido/estranho, marcamos mudança
  if (input.shipping !== undefined && !shippingObj) changed = true;

  const computedTotal = Math.max(0, subtotal - discount + (shipping?.price ?? 0));
  const totalRaw = typeof input.total === "number" ? input.total : Number(input.total);
  const total = Number.isFinite(totalRaw) ? totalRaw : computedTotal;
  if (!Number.isFinite(totalRaw)) changed = true;

  const items = Array.isArray(input.items) ? (input.items as unknown[]) : [];
  if (!Array.isArray(input.items)) changed = true;

  // status: fallback seguro se vier desconhecido
  const rawStatus = toString(input.status, "created");
  const status = (rawStatus || "created") as Order["status"];
  if (!rawStatus) changed = true;

  const timeline = Array.isArray(input.timeline) ? (input.timeline as unknown[]) : [];
  if (!Array.isArray(input.timeline)) changed = true;

  const createdAt = toISODate(input.createdAt);
  if (toString(input.createdAt) !== createdAt) changed = true;

  const address = isObject(input.address) ? (input.address as unknown) : undefined;
  const payment = isObject(input.payment) ? (input.payment as unknown) : undefined;
  const note = typeof input.note === "string" ? input.note : undefined;

  const normalized: Order = {
    id,
    items: items as any, // manter compatível sem validar CartItem runtime
    subtotal,
    discount,
    shipping,
    total,
    address: address as any,
    payment: payment as any,
    note,
    status,
    timeline: timeline as any,
    createdAt,
  };

  return { order: normalized, changed };
}

export async function listOrders(): Promise<Order[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];

  const parsed = safeJsonParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  let anyChanged = false;

  const normalized = parsed
    .map((it) => {
      const r = normalizeOrder(it);
      if (r.changed) anyChanged = true;
      return r.order;
    })
    .filter((it): it is Order => it !== null);

  // Auto-heal REAL: regrava quando algo mudou OU quando itens inválidos foram filtrados
  if (anyChanged || normalized.length !== parsed.length) {
    await setOrders(normalized);
  }

  return normalized;
}

export async function setOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(orders));
}

export async function addOrder(order: Order): Promise<void> {
  const normalized = normalizeOrder(order).order ?? order;

  const current = await listOrders();

  // Dedup por id (mantém mais recente no topo)
  const next = [normalized, ...current.filter((o) => o.id !== normalized.id)];
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
  const normalized = normalizeOrder(order).order ?? order;

  const orders = await listOrders();
  const next = orders.map((o) => (o.id === normalized.id ? normalized : o));
  await setOrders(next);
}