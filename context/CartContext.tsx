// context/CartContext.tsx
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { Product } from "../data/catalog";
import { getJson, setJson } from "../utils/storage";

/**
 * CartItem (COMPATÍVEL COM cart.tsx + checkout)
 * - cart.tsx usa campos "flat": id, title, price, image, etc.
 * - checkout/review pode usar it.product.*
 */
export type CartItem = {
  // checkout
  product: Product;

  // carrinho (compat)
  id: string;
  title: string;
  price: number;
  category?: string;
  image?: string;
  description?: string;
  unitLabel?: string;
  discountPercent?: number;

  // comum
  qty: number;
};

type CartState = { items: CartItem[] };

const STORAGE_KEY = "plugaishop.cart.v2";

const state: CartState = { items: [] };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };}

function getSnapshot(): CartState {
  return { items: state.items };
}

function setItems(next: CartItem[]) {
  state.items = Array.isArray(next) ? next : [];
  emit();
}

function normalizeQty(qty: unknown) {
  const q = Math.floor(Number(qty));
  return Number.isFinite(q) ? Math.max(1, q) : 1;
}

function clampMoney(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Helper: transforma Product -> CartItem flat */
function toCartItem(product: Product, qty: number): CartItem {
  const p: any = product as any;

  return {
    product,
    id: String(p?.id ?? ""),
    title: String(p?.title ?? ""),
    price: clampMoney(p?.price),
    category: String(p?.category ?? ""),
    image: String(p?.image ?? ""),
    description: String(p?.description ?? ""),
    unitLabel: String(p?.unitLabel ?? ""),
    discountPercent: Number.isFinite(Number(p?.discountPercent)) ? Number(p?.discountPercent) : undefined,
    qty: normalizeQty(qty),
  };
}

/** Helper: aceita “flat item” (undo) e tenta resolver Product básico */
function toCartItemFromFlat(flat: Partial<CartItem> & { id: string }): CartItem {
  const id = String(flat.id ?? "");
  const title = String(flat.title ?? "Produto");
  const price = clampMoney(flat.price);
  const product = (flat.product as Product | undefined) ?? ({ id, title, price, category: "", image: flat.image ?? "" } as any);

  return {
    product,
    id,
    title,
    price,
    category: flat.category,
    image: flat.image,
    description: flat.description,
    unitLabel: flat.unitLabel,
    discountPercent: flat.discountPercent,
    qty: normalizeQty(flat.qty ?? 1),
  };
}

/**
 * Regras de negócio
 */
function upsertByProduct(product: Product, qtyDelta: number) {
  const pid = String((product as any)?.id ?? "");
  if (!pid) return;

  const current = state.items;
  const index = current.findIndex((i) => i.id === pid);

  if (index === -1) {
    setItems([...current, toCartItem(product, Math.max(1, qtyDelta))]);
    return;
  }

  const nextQty = normalizeQty(current[index].qty + qtyDelta);

  setItems(current.map((it, i) => (i === index ? { ...toCartItem(product, nextQty), qty: nextQty } : it)));
}

function setQty(productId: string, qty: number) {
  const q = normalizeQty(qty);
  setItems(
    state.items.map((it) => {
      if (it.id !== productId) return it;
      return { ...toCartItem(it.product, q), qty: q };
    })
  );
}

function remove(productId: string) {
  setItems(state.items.filter((it) => it.id !== productId));
}

function clear() {
  setItems([]);
}

function addFlatItem(flat: Partial<CartItem> & { id: string }, qty?: number) {
  const item = toCartItemFromFlat({ ...flat, qty: qty ?? flat.qty ?? 1 });
  const current = state.items;
  const index = current.findIndex((i) => i.id === item.id);

  if (index === -1) {
    setItems([...current, item]);
    return;
  }

  const nextQty = normalizeQty(current[index].qty + normalizeQty(qty ?? item.qty));
  setItems(current.map((it, i) => (i === index ? { ...it, qty: nextQty } : it)));
}

/**
 * API Público
 * - Mantém aliases para compatibilidade com diferentes telas/histórico do projeto.
 */
export function useCart() {
  const [snap, setSnap] = useState<CartState>(() => getSnapshot());

  useEffect(() => {
    return subscribe(() => setSnap(getSnapshot()));
  }, []);

  const totalQty = useMemo(() => snap.items.reduce((acc, it) => acc + normalizeQty(it.qty), 0), [snap.items]);

  const subtotal = useMemo(() => {
    return snap.items.reduce((acc, it) => acc + clampMoney(it.price) * normalizeQty(it.qty), 0);
  }, [snap.items]);

  const total = subtotal;

  // “V2” (Product-based)
  const addItem = useCallback((product: Product, qtyDelta: number = 1) => upsertByProduct(product, qtyDelta), []);
  const decItem = useCallback((product: Product, qtyDelta: number = 1) => upsertByProduct(product, -Math.abs(qtyDelta)), []);

  // “Compat” (id-based)
  const increment = useCallback((id: string) => {
    const found = state.items.find((it) => it.id === id);
    if (!found) return;
    upsertByProduct(found.product, 1);
  }, []);

  const decrement = useCallback((id: string) => {
    const found = state.items.find((it) => it.id === id);
    if (!found) return;
    // mínimo 1 (não remove no decrement)
    const next = Math.max(1, normalizeQty(found.qty) - 1);
    setQty(found.id, next);
  }, []);

  const removeItem = useCallback((id: string) => remove(id), []);
  const removeCompat = removeItem;

  const setItemQty = useCallback((id: string, qty: number) => setQty(id, qty), []);
  const clearCart = useCallback(() => clear(), []);

  // “Compat” (flat add) para undo/remove
  const add = useCallback((item: any, qty?: number) => {
    // aceita Product ou flat item
    if (item && typeof item === "object" && (item as any).id && (item as any).title && (item as any).price != null) {
      if ((item as any).product) {
        addFlatItem(item as any, qty);
      } else if ((item as any).category != null || (item as any).image != null) {
        addFlatItem(item as any, qty);
      } else {
        // pode ser Product (com campos diferentes)
        addItem(item as Product, qty ?? 1);
      }
      return;
    }
    // fallback
    if (item) addItem(item as Product, qty ?? 1);
  }, [addItem]);

  const removeApi = useCallback((id: string) => removeCompat(id), [removeCompat]);

  return {
    // data
    items: snap.items,

    // totals
    totalQty,
    subtotal,
    total,

    // modern API
    addItem,
    decItem,
    removeItem,
    setItemQty,
    clearCart,

    // compat aliases
    add,
    remove: removeApi,
    increment,
    decrement,
    setQty: setItemQty,
    clear: clearCart,
  };
}

/**
 * Provider: persistência (AsyncStorage via utils/storage.ts)
 * - Carrega 1x no mount
 * - Salva com debounce leve para não travar UI
 */
const ProviderContext = createContext(true);

export function CartProvider({ children }: { children: ReactNode }) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const restored = await getJson<CartItem[]>(STORAGE_KEY, []);
      if (!mounted) return;
      if (Array.isArray(restored)) setItems(restored);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // persist (subscribe no store)
  useEffect(() => {
    const unsub = subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void setJson(STORAGE_KEY, state.items);
      }, 220);
    });

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      unsub();
    };
  }, []);

  return <ProviderContext.Provider value={true}>{children}</ProviderContext.Provider>;
}

export function useCartProviderGuard() {
  return useContext(ProviderContext);
}

