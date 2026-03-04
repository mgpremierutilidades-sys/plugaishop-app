import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderDraft } from "../types/order";

const KEY = "@plugaishop:order_draft";

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveOrderDraft(order: OrderDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // best-effort: não quebra checkout
  }
}

export async function loadOrderDraft(): Promise<OrderDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = safeJsonParse<OrderDraft>(raw);
    return parsed ?? null;
  } catch {
    return null;
  }
}

export async function clearOrderDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}