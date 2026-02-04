// context/CartContext.tsx
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "../data/catalog";

/**
 * CartItem (COMPATÍVEL COM O cart.tsx + checkout)
 * - cart.tsx usa campos "flat": id, title, price, image, etc.
 * - checkout/review usa it.product.*
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

/**
 * ESTADO INTERNO
 */
type CartState = {
  items: CartItem[];
};

const state: CartState = { items: [] };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CartState {
  return { items: state.items };
}

function setItems(next: CartItem[]) {
  state.items = next;
  emit();
}

/** Helper: transforma Product -> CartItem flat */
function toCartItem(product: Product, qty: number): CartItem {
  const price = Number((product as any).price) || 0;

  return {
    product,
    id: (product as any).id,
    title: (product as any).title ?? "",
    price,
    category: (product as any).category,
    image: (product as any).image,
    description: (product as any).description,
    unitLabel: (product as any).unitLabel,
    discountPercent: (product as any).discountPercent,
    qty,
  };
}

/**
 * REGRAS DE NEGÓCIO
 */
function upsert(product: Product, qtyDelta: number) {
  const current = state.items;
  const pid = (product as any).id;
  const index = current.findIndex((i) => i.id === pid);

  if (index === -1) {
    setItems([...current, toCartItem(product, Math.max(1, qtyDelta))]);
    return;
  }

  const nextQty = current[index].qty + qtyDelta;

  if (nextQty <= 0) {
    setItems(current.filter((_, i) => i !== index));
    return;
  }

  setItems(
    current.map((it, i) => (i === index ? { ...toCartItem(it.product, nextQty), qty: nextQty } : it))
  );
}

function setQty(productId: string, qty: number) {
  const q = Math.max(1, Math.floor(qty));
  setItems(
    state.items.map((it) =>
      it.id === productId ? { ...toCartItem(it.product, q), qty: q } : it
    )
  );
}

function remove(productId: string) {
  setItems(state.items.filter((it) => it.id !== productId));
}

function clear() {
  setItems([]);
}

/**
 * HOOK PÚBLICO
 * (com aliases para compatibilidade com o cart.tsx)
 */
export function useCart() {
  const [snap, setSnap] = useState<CartState>(() => getSnapshot());

  useEffect(() => {
    const unsub = subscribe(() => setSnap(getSnapshot()));
    return unsub;
  }, []);

  const totalQty = useMemo(() => snap.items.reduce((acc, it) => acc + it.qty, 0), [snap.items]);

  const subtotal = useMemo(() => {
    return snap.items.reduce((acc, it) => {
      const price = Number(it.price);
      return acc + (Number.isFinite(price) ? price * it.qty : 0);
    }, 0);
  }, [snap.items]);

  const total = subtotal;

  const addItem = useCallback((product: Product, qtyDelta: number = 1) => upsert(product, qtyDelta), []);
  const decItem = useCallback((product: Product, qtyDelta: number = 1) => upsert(product, -Math.abs(qtyDelta)), []);

  const removeItem = useCallback((productId: string, _ignored?: any) => remove(productId), []);
  const setItemQty = useCallback((productId: string, qty: number) => setQty(productId, qty), []);
  const clearCart = useCallback(() => clear(), []);

  return {
    items: snap.items,

    totalQty,
    subtotal,
    total,

    addItem,
    decItem,
    removeItem,
    setItemQty,
    clearCart,

    setQty: setItemQty,
  };
}

const DummyCartContext = createContext(true);

export function CartProvider({ children }: { children: ReactNode }) {
  return <DummyCartContext.Provider value={true}>{children}</DummyCartContext.Provider>;
}

export function useCartProviderGuard() {
  return useContext(DummyCartContext);
}
