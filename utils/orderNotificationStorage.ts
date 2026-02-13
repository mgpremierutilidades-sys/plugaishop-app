import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderStatus } from "../types/orderStatus";

const KEY = "plugaishop.lastNotifiedStatus.v1";

type Map = Record<string, OrderStatus>;

async function readMap(): Promise<Map> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Map;
  } catch {
    return {};
  }
}

async function writeMap(map: Map): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // silencioso (não quebra fluxo)
  }
}

export async function getLastNotifiedStatus(
  orderId: string,
): Promise<OrderStatus | null> {
  const map = await readMap();
  return map[orderId] ?? null;
}

export async function setLastNotifiedStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const map = await readMap();
  map[orderId] = status;
  await writeMap(map);
}
