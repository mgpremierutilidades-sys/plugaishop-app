import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifyNotificationsChanged } from "../lib/notificationsBus";
import type { InAppNotification } from "../types/order";

const KEY = "@plugaishop:notifications";

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function normalizeNotification(input: unknown): InAppNotification | null {
  if (!isObject(input)) return null;

  const id = toString(input.id);
  if (!id) return null;

  const title = toString(input.title);
  const body = toString(input.body);
  const createdAt = toString(input.createdAt) || new Date().toISOString();
  const read = toBool(input.read, false);

  const data = isObject(input.data) ? (input.data as Record<string, any>) : undefined;
  const orderId = toString(input.orderId) || undefined;

  return {
    id,
    title,
    body,
    createdAt,
    read,
    data,
    orderId,
  };
}

export async function listNotifications(): Promise<InAppNotification[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];

  const parsed = safeParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  const normalized = parsed
    .map((n) => normalizeNotification(n))
    .filter((n): n is InAppNotification => n !== null);

  // auto-heal se veio algo inválido
  if (normalized.length !== parsed.length) {
    await setNotifications(normalized);
  }

  return normalized;
}

export async function setNotifications(items: InAppNotification[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

/**
 * Adiciona no topo (mais recente primeiro) e dispara refresh do badge.
 */
export async function addNotification(
  n: InAppNotification,
): Promise<InAppNotification[]> {
  const normalized = normalizeNotification(n) ?? n;
  const current = await listNotifications();

  // evita duplicar por id
  if (current.some((x) => x.id === normalized.id)) return current;

  const next = [normalized, ...current];
  await setNotifications(next);

  // ✅ badge sync imediato em qualquer tela
  try {
    notifyNotificationsChanged();
  } catch {}

  return next;
}

export async function markAllRead(): Promise<void> {
  const current = await listNotifications();
  const next = current.map((n) => ({ ...n, read: true }));
  await setNotifications(next);

  try {
    notifyNotificationsChanged();
  } catch {}
}

export async function markRead(id: string): Promise<void> {
  const current = await listNotifications();
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  await setNotifications(next);

  try {
    notifyNotificationsChanged();
  } catch {}
}

export async function getUnreadCount(): Promise<number> {
  const current = await listNotifications();
  return current.filter((n) => !n.read).length;
}

export async function clearNotifications(): Promise<void> {
  await AsyncStorage.removeItem(KEY);

  try {
    notifyNotificationsChanged();
  } catch {}
}