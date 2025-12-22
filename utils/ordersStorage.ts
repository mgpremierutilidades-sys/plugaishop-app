import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Order } from "../types/order";

const KEY = "@plugaishop:orders";

export async function listOrders(): Promise<Order[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export async function setOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(orders));
}

export async function addOrder(order: Order): Promise<void> {
  const current = await listOrders();
  const next = [order, ...current];
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
  const orders = await listOrders();
  const next = orders.map((o) => (o.id === order.id ? order : o));
  await setOrders(next);
}
