// context/CartContext.tsx
import type { ReactNode } from "react";
import {
  createContext,
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

type CartSnapshot = {
  items: CartItem[];
  ready: boolean;
  hydrating: boolean;
};

type PersistedCartV1 = {
  v: 1;
  updatedAt: number;
  items: {
    id: string;
    qty: number;
    title?: string;
    price?: number;
    category?: string;
    image?: string;
    description?: string;
    unitLabel?: string;
    discountPercent?: number;
  }[];
};

const KEY = "@plugaishop:cart:v1";

// ===== Store singleton =====
const listeners = new Set<() => void>();

let ready = false;
let hydrating = false;

let items: CartItem[] = [];
let indexById: Record<string, number> = Object.create(null);

let hydrationStarted = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * ✅ REGRA DE OURO (Fabric DEV):
 * getSnapshot() NUNCA pode criar objeto/array.
 * Sempre retorna a MESMA referência enquanto nada mudou.
 */
let snapshotRef: CartSnapshot = { items, ready, hydrating };

function commit() {
  // Só troca a referência quando algo mudou de fato.
  if (
    snapshotRef.items === items &&
    snapshotRef.ready === ready &&
    snapshotRef.hydrating === hydrating
  ) {
    return;
  }

  snapshotRef = { items, ready, hydrating };

  // DEV: evita mutação acidental por algum consumidor
  if (__DEV__) Object.freeze(snapshotRef);
}

function getSnapshot(): CartSnapshot {
  return snapshotRef;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  // Blindagem extra: garante snapshot compatível com o estado atual
  commit();
  listeners.forEach((l) => l());
}

function rebuildIndex(next: CartItem[]) {
  const idx: Record<string, number> = Object.create(null);
  for (let i = 0; i < next.length; i++) idx[next[i].id] = i;
  indexById = idx;
}

function findProductById(id: string): Product | null {
  return products.find((p) => String(p.id) === String(id)) ?? null;
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

function schedulePersist() {
  if (!isFlagEnabled("ff_cart_persist_v1")) return;

  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    persistTimer = null;

    const payload: PersistedCartV1 = {
      v: 1,
      updatedAt: Date.now(),
      items: items.map((it) => ({
        id: it.id,
        qty: it.qty,
        title: it.title,
        price: it.price,
        category: it.category,
        image: it.image,
        description: it.description,
        unitLabel: it.unitLabel,
        discountPercent: it.discountPercent,
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

function setItems(next: CartItem[], reason?: string) {
  // Evita churn se alguém passar a mesma referência
  if (next === items) return;

  items = next;
  rebuildIndex(next);

  if (reason && isFlagEnabled("ff_cart_analytics_v1")) {
    track("cart_mutation", { reason, items_count: next.length });
  }

  emit();
  schedulePersist();
}

// ===== O(1) mutations =====
function addOrInc(product: Product, delta: number) {
  const id = String(product.id);
  const idx = indexById[id];

  if (idx === undefined) {
    setItems([...items, toCartItem(product, Math.max(1, delta))], "add_new");
    return;
  }

  const curr = items[idx];
  const nextQty = curr.qty + delta;

  if (nextQty <= 0) {
    setItems(
      items.filter((it) => it.id !== id),
      "remove_zero",
    );
    return;
  }

  const next = items.slice();
  next[idx] = { ...toCartItem(curr.product, nextQty), qty: nextQty };
  setItems(next, "update_qty");
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
    ready = true;
    hydrating = false;
    emit();
    return;
  }

  hydrating = true;
  emit();

  try {
    const data = await storageGetJSON<PersistedCartV1>(KEY);

    if (!data || data.v !== 1 || !Array.isArray(data.items)) {
      ready = true;
      hydrating = false;
      emit();
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

    items = next;
    rebuildIndex(next);

    ready = true;
    hydrating = false;
    emit();

    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_rehydration_success", { items_count: next.length });
    }
  } catch (e: any) {
    ready = true;
    hydrating = false;
    emit();
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

  return {
    items: snap.items,
    ready: snap.ready,
    hydrating: snap.hydrating,

    totalQty,
    subtotal,
    total,

    addItem: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, Math.max(1, Math.abs(qtyDelta))),
    decItem: (product: Product, qtyDelta: number = 1) =>
      addOrInc(product, -Math.max(1, Math.abs(qtyDelta))),
    removeItem: (productId: string) => remove(productId),
    setItemQty: (productId: string, qty: number) => setQty(productId, qty),
    clearCart: () => clear(),

    // alias compat
    setQty: (productId: string, qty: number) => setQty(productId, qty),
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
