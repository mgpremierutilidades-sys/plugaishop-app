import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderStatus } from "../types/order";

const KEY = "@plugaishop:last_notified_status_by_order";

type MapState = Record<string, OrderStatus | undefined>;

async function readMap(): Promise<MapState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MapState;
  } catch {
    return {};
  }
}

async function writeMap(map: MapState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function getLastNotifiedStatus(orderId: string): Promise<OrderStatus | undefined> {
  const map = await readMap();
  return map[orderId];
}

export async function setLastNotifiedStatus(orderId: string, status: OrderStatus) {
  const map = await readMap();
  map[orderId] = status;
  await writeMap(map);
}
