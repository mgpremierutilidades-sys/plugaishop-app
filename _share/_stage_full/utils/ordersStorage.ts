// utils/orderStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderDraft } from "../types/order";

const STORAGE_KEY = "plugaishop.orderDraft.v2";
const DRAFT_VERSION: 2 = 2;

function safeParse(raw: string | null): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function hashPricing(p: OrderDraft["pricing"]): string {
  if (!p) return "";
  return [
    p.subtotalRaw,
    p.productDiscountTotal,
    p.couponDiscount,
    p.protectionTotal,
    p.shippingEstimated,
    p.discountTotal,
    p.total,
  ].join("|");
}

function normalizeDraft(input: any | null): OrderDraft | null {
  if (!input || typeof input !== "object") return null;

  const items = Array.isArray(input.items) ? input.items : [];
  const selectedItemIds =
    Array.isArray(input.selectedItemIds) && input.selectedItemIds.length > 0
      ? input.selectedItemIds.map((x: any) => String(x))
      : items.map((it: any) => String(it?.id ?? "")).filter(Boolean);

  const createdAt = typeof input.createdAt === "string" && input.createdAt ? input.createdAt : nowISO();

  const normalized: OrderDraft = {
    ...input,
    v: DRAFT_VERSION,
    createdAt,
    items,
    selectedItemIds,
  };

  if (normalized.pricing) {
    normalized.pricingHash = hashPricing(normalized.pricing);
  }

  return normalized;
}

/**
 * Load com migração/normalização defensiva
 */
export async function loadOrderDraft(): Promise<OrderDraft | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw);

  const normalized = normalizeDraft(parsed);
  if (!normalized) return null;

  // Regrava normalizado (corrige drafts legados e garante v=2/createdAt/selectedItemIds)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

/**
 * Save sempre normaliza e garante v=2/createdAt/selectedItemIds
 */
export async function saveOrderDraft(draft: OrderDraft): Promise<void> {
  const normalized = normalizeDraft(draft) ?? {
    v: DRAFT_VERSION,
    createdAt: nowISO(),
    items: [],
    selectedItemIds: [],
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

/**
 * Atualiza parcialmente sem perder snapshot
 * - exige items/selectedItemIds no patch para manter consistência
 * - mas se selectedItemIds vier vazio/undefined, normaliza para ids de items
 */
export async function upsertOrderDraft(
  patch: Partial<OrderDraft> & Pick<OrderDraft, "items">
): Promise<OrderDraft> {
  const current = (await loadOrderDraft()) ?? {
    v: DRAFT_VERSION,
    createdAt: nowISO(),
    items: [],
    selectedItemIds: [],
  };

  const merged: OrderDraft = {
    ...current,
    ...patch,
  };

  const normalized = normalizeDraft(merged) ?? merged;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function clearOrderDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
