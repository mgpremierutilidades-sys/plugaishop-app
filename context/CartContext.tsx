// PATH: context/CartContext.tsx
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { isFlagEnabled } from "../constants/flags";
import type { Product } from "../data/catalog";
import { products } from "../data/catalog";
import { track } from "../lib/analytics";
import { storageGetJSON, storageSetJSON } from "../lib/storage";

export type CartItem = {
  product: Product;

  id: string;
  title: string;
  price: number;
  category?: string;
  image?: string;
  description?: string;
  unitLabel?: string;
  discountPercent?: number;

  qty: number;
};

type PersistedCartV1 = {
  v: 1;
  items: {
    id: string;
    title?: string;
    price?: number;
    category?: string;
    image?: string;
    description?: string;
    unitLabel?: string;
    discountPercent?: number;
    qty: number;
  }[];
};

const KEY = "plugaishop_cart_v1";

// ===== Store (singleton) =====
let items: CartItem[] = [];
let ready = false;
let hydrating = false;

let hydrationStarted = false;

const listeners = new Set<() => void>();
const indexById: Record<string, number> = {};

type Snapshot = {
  items: CartItem[];
  ready: boolean;
  hydrating: boolean;
};

/**
 * CRITICAL: useSyncExternalStore requires getSnapshot() to return a value
 * that is stable (same reference) between renders unless the store changed.
 * If getSnapshot returns a new object every time, React can enter an infinite loop.
 */
let snapshot: Snapshot = { items, ready, hydrating };

function rebuildIndex(next: CartItem[]) {
  for (const k of Object.keys(indexById)) delete indexById[k];
  next.forEach((it, i) => {
    indexById[String(it.id)] = i;
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function setSnapshot(nextItems: CartItem[], nextReady: boolean, nextHydrating: boolean) {
  // Only create a NEW reference when state actually changes.
  if (nextItems === snapshot.items && nextReady === snapshot.ready && nextHydrating === snapshot.hydrating) {
    return;
  }
  snapshot = { items: nextItems, ready: nextReady, hydrating: nextHydrating };
}

function findProductById(id: string): Product | undefined {
  return (products as Product[]).find((p) => String(p.id) === String(id));
}

function toCartItem(product: Product, qty: number): CartItem {
  const q = Math.max(1, Math.floor(Number(qty) || 1));
  return {
    product,
    id: String(product.id),
    title: String(product.title ?? ""),
    price: Number(product.price ?? 0),
    category: product.category,
    image: product.image,
    description: product.description,
    unitLabel: product.unitLabel,
    discountPercent: product.discountPercent,
    qty: q,
  };
}

let persistTimer: any = null;

async function persistDebounced() {
  if (!isFlagEnabled("ff_cart_persist_v1")) return;

  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    const payload: PersistedCartV1 = {
      v: 1,
      items: items.map((it) => ({
        id: it.id,
        title: it.title,
        price: it.price,
        category: it.category,
        image: it.image,
        description: it.description,
        unitLabel: it.unitLabel,
        discountPercent: it.discountPercent,
        qty: it.qty,
      })),
    };

    const ok = await storageSetJSON(KEY, payload);
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track(ok ? "cart_persist_success" : "cart_persist_fail", {
        items_count: items.length,
      });
    }
  }, 350);
}

/**
 * Single state transition point for the store.
 * - updates globals
 * - rebuilds index
 * - updates snapshot (NEW ref only on real change)
 * - emits listeners
 */
function applyStoreState(nextItems: CartItem[], nextReady: boolean, nextHydrating: boolean, emitNow: boolean) {
  items = nextItems;
  ready = nextReady;
  hydrating = nextHydrating;

  rebuildIndex(nextItems);
  setSnapshot(nextItems, nextReady, nextHydrating);

  if (emitNow) emit();
}

function setItems(next: CartItem[], reason?: string) {
  // Avoid churn if same reference
  if (next === items) return;

  applyStoreState(next, ready, hydrating, true);

  if (isFlagEnabled("ff_cart_analytics_v1") && reason) {
    track("cart_changed", { reason, items_count: next.length });
  }

  void persistDebounced();
}

function addOrInc(product: Product, delta: number) {
  const id = String(product.id);
  const idx = indexById[id];

  if (idx === undefined) {
    const q = Math.max(1, Math.floor(Number(delta) || 1));
    setItems([...items, toCartItem(product, q)], "add_or_inc_new");
    return;
  }

  const curr = items[idx];
  const nextQty = Math.max(1, curr.qty + (Number(delta) || 0));
  const next = items.slice();
  next[idx] = { ...toCartItem(curr.product, nextQty), qty: nextQty };
  setItems(next, "add_or_inc_existing");
}

function setQty(productId: string, qty: number) {
  const id = String(productId);
  const idx = indexById[id];
  if (idx === undefined) return;

  const q = Math.max(1, Math.floor(Number(qty) || 1));
  const curr = items[idx];

  const next = items.slice();
  next[idx] = { ...toCartItem(curr.product, q), qty: q };
  setItems(next, "set_qty");
}

function remove(productId: string) {
  const id = String(productId);
  const idx = indexById[id];
  if (idx === undefined) return;

  setItems(
    items.filter((it) => it.id !== id),
    "remove_item",
  );
}

function clear() {
  setItems([], "clear");
}

// ===== Hydration determinística =====
async function hydrateOnce() {
  if (hydrationStarted) return;
  hydrationStarted = true;

  if (!isFlagEnabled("ff_cart_rehydration_hardened")) {
    applyStoreState(items, true, false, true);
    return;
  }

  applyStoreState(items, ready, true, true);

  try {
    const data = await storageGetJSON<PersistedCartV1>(KEY);

    if (!data || data.v !== 1 || !Array.isArray(data.items)) {
      applyStoreState(items, true, false, true);
      if (isFlagEnabled("ff_cart_analytics_v1")) {
        track("cart_rehydration_success", { items_count: 0 });
      }
      return;
    }

    const next: CartItem[] = [];
    for (const it of data.items) {
      const id = String(it?.id ?? "");
      if (!id) continue;

      const qty = Math.max(1, Math.floor(Number(it?.qty ?? 1)));
      const p = findProductById(id);

      if (p) {
        next.push(toCartItem(p, qty));
      } else {
        const fallback: Product = {
          id,
          title: String(it.title ?? "Produto"),
          price: Number(it.price ?? 0),
          category: String(it.category ?? ""),
          image: it.image,
          description: it.description,
          unitLabel: it.unitLabel,
          discountPercent: it.discountPercent,
        };
        next.push(toCartItem(fallback, qty));
      }
    }

    // Hydration should not immediately persist back; only set store and emit.
    applyStoreState(next, true, false, true);

    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_rehydration_success", { items_count: next.length });
    }
  } catch (e: any) {
    applyStoreState(items, true, false, true);
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_rehydration_fail", { message: String(e?.message ?? e) });
    }
  }
}

export function useCart() {
  // ✅ Garante hydration mesmo se alguém esquecer o Provider (guard impede duplicar)
  useEffect(() => {
    void hydrateOnce();
  }, []);

  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const totalQty = useMemo(
    () => snap.items.reduce((acc, it) => acc + it.qty, 0),
    [snap.items],
  );

  const subtotal = useMemo(() => {
    return snap.items.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * it.qty,
      0,
    );
  }, [snap.items]);

  const total = subtotal;

  // ===== Compat helpers (não quebrar telas antigas) =====
  const resolveProduct = useCallback((p: any): Product | null => {
    if (!p) return null;
    if (typeof p === "object" && typeof p.id === "string") return p as Product;
    // aceita { product }, { item }
    const inner = (p as any)?.product ?? (p as any)?.item;
    if (inner && typeof inner.id === "string") return inner as Product;

    const id = String((p as any)?.id ?? (p as any)?.productId ?? "");
    if (!id) return null;
    const found = findProductById(id);
    if (found) return found;

    // fallback mínimo para não quebrar UI
    return {
      id,
      title: String((p as any)?.title ?? "Produto"),
      price: Number((p as any)?.price ?? 0),
      category: String((p as any)?.category ?? ""),
      image: (p as any)?.image,
      description: (p as any)?.description,
      unitLabel: (p as any)?.unitLabel,
      discountPercent: (p as any)?.discountPercent,
    };
  }, []);

  return {
    items: snap.items,
    ready: snap.ready,
    hydrating: snap.hydrating,

    totalQty,
    subtotal,
    total,

    // API principal
    addItem: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, Math.max(1, Math.abs(qtyDelta))),
    decItem: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, -Math.max(1, Math.abs(qtyDelta))),
    removeItem: (productId: string) => remove(productId),
    setItemQty: (productId: string, qty: number) => setQty(productId, qty),
    clearCart: () => clear(),

    // alias compat (nomes antigos)
    add: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, Math.max(1, Math.abs(qtyDelta))),
    inc: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, Math.max(1, Math.abs(qtyDelta))),
    increase: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, Math.max(1, Math.abs(qtyDelta))),
    dec: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, -Math.max(1, Math.abs(qtyDelta))),
    decrease: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, -Math.max(1, Math.abs(qtyDelta))),
    remove: (productId: string) => remove(productId),
    setQty: (productId: string, qty: number) => setQty(productId, qty),

    // ✅ safe* (contrato citado pelo build system)
    safeAdd: (p: any, qtyDelta: number = 1) => {
      const pr = resolveProduct(p);
      if (!pr) return;
      addOrInc(pr, Math.max(1, Math.abs(qtyDelta)));
    },
    safeDec: (p: any, qtyDelta: number = 1) => {
      const pr = resolveProduct(p);
      if (!pr) return;
      addOrInc(pr, -Math.max(1, Math.abs(qtyDelta)));
    },
    safeRemove: (p: any) => {
      const pr = resolveProduct(p);
      const id = pr?.id ?? String(p?.id ?? p?.productId ?? "");
      if (!id) return;
      remove(id);
    },
  };
}

// Provider apenas faz bootstrap (store é singleton)
const DummyCartContext = createContext(true);

export function CartProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void hydrateOnce();
  }, []);

  return (
    <DummyCartContext.Provider value={true}>
      {children}
    </DummyCartContext.Provider>
  );
}

export function useCartProviderGuard() {
  return useContext(DummyCartContext);
}