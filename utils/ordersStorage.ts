// utils/orderStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderDraft } from "../types/order";

const KEY = "plugaishop.checkout.draft.v1";

function toNumber(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function safeDraft(raw: any): OrderDraft | null {
  if (!raw || typeof raw !== "object") return null;

  const items = Array.isArray(raw.items) ? raw.items : [];
  const subtotal = toNumber(raw.subtotal);
  const discount = raw.discount == null ? 0 : toNumber(raw.discount);
  const total = toNumber(raw.total);

  const shipping =
    raw.shipping && typeof raw.shipping === "object"
      ? {
          method: String((raw.shipping as any).method ?? "standard"),
          price: toNumber((raw.shipping as any).price ?? 0),
          deadline: String((raw.shipping as any).deadline ?? ""),
        }
      : undefined;

  const address =
    raw.address && typeof raw.address === "object"
      ? {
          id: String((raw.address as any).id ?? "address"),
          label: (raw.address as any).label ? String((raw.address as any).label) : undefined,
          street: (raw.address as any).street ? String((raw.address as any).street) : undefined,
          number: (raw.address as any).number ? String((raw.address as any).number) : undefined,
          city: (raw.address as any).city ? String((raw.address as any).city) : undefined,
          state: (raw.address as any).state ? String((raw.address as any).state) : undefined,
          zip: (raw.address as any).zip ? String((raw.address as any).zip) : undefined,
        }
      : undefined;

  const payment =
    raw.payment && typeof raw.payment === "object"
      ? {
          method: (raw.payment as any).method,
          status: (raw.payment as any).status,
        }
      : undefined;

  const note = raw.note ? String(raw.note) : undefined;
  const id = raw.id ? String(raw.id) : undefined;

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
  };
}

export async function loadOrderDraft(): Promise<OrderDraft | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return safeDraft(parsed);
  } catch {
    return null;
  }
}

export async function saveOrderDraft(draft: OrderDraft): Promise<void> {
  const safe = safeDraft(draft) ?? draft;
  await AsyncStorage.setItem(KEY, JSON.stringify(safe));
}

export async function clearOrderDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
