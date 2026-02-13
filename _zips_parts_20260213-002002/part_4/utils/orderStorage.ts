import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderDraft } from "../types/order";

const KEY = "@plugaishop:order_draft";

export async function saveOrderDraft(order: OrderDraft) {
  await AsyncStorage.setItem(KEY, JSON.stringify(order));
}

export async function loadOrderDraft(): Promise<OrderDraft | null> {
  const data = await AsyncStorage.getItem(KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearOrderDraft() {
  await AsyncStorage.removeItem(KEY);
}
