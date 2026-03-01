import type { Order } from "../types/order";
import type { OrderStatus } from "../types/orderStatus";
import { advanceOrderStatus } from "./orderProgress";

const COOL_DOWN_MS = 20_000; // 20s (simulação)

function nowMs() {
  return Date.now();
}

function isFinal(status: OrderStatus): boolean {
  return status === "delivered" || status === "canceled" || status === "cancelled";
}

function isEligible(status: OrderStatus): boolean {
  // pode avançar nos estágios iniciais (simulação)
  return status === "created" || status === "payment_pending" || status === "paid";
}

function getLastMs(order: Order): number {
  // guardamos em note como: "__autoprog_last=<ms>"
  const note = typeof order.note === "string" ? order.note : "";
  const m = note.match(/__autoprog_last=(\d+)/);
  if (!m) return 0;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : 0;
}

function setLastMs(order: Order, ms: number): Order {
  const base = typeof order.note === "string" ? order.note : "";
  const cleaned = base.replace(/__autoprog_last=\d+\s*/g, "").trim();
  const tag = `__autoprog_last=${ms}`;
  const nextNote = cleaned ? `${cleaned}\n${tag}` : tag;
  return { ...order, note: nextNote };
}

/**
 * Retorna:
 * - null: não mudou
 * - Order: mudou e deve ser persistido
 */
export function maybeAutoProgressOrder(order: Order): Order | null {
  if (isFinal(order.status)) return null;
  if (!isEligible(order.status)) return null;

  const last = getLastMs(order);
  const now = nowMs();

  if (now - last < COOL_DOWN_MS) return null;

  // avança 1 step
  const next = advanceOrderStatus(order);

  // se não mudou, não grava
  if (next.status === order.status) return null;

  return setLastMs(next, now);
}