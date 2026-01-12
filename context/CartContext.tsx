// context/CartContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "../data/catalog";
import { products } from "../data/catalog";

/**
 * CartItem (compatível com cart.tsx + checkout)
 */
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

type CartState = { items: CartItem[] };

/**
 * Persistência: salvar somente (id, qty)
 */
type CartPersistedV1 = {
  v: 1;
  items: { id: string; qty: number }[];
  updatedAt: string;
};

const CART_STORAGE_KEY = "plugaishop.cart.v1";
const QTY_MIN = 1;
const QTY_MAX = 99;

// Seed DEV: para conseguir testar o Carrinho direto na aba, sem precisar entrar pelo Explore
const CART_DEV_SEEDED_KEY = "plugaishop.cart.dev_seeded.v1";

/**
 * Store interno (module singleton)
 */
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

function clampQty(qty: unknown) {
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n)) return QTY_MIN;
  return Math.max(QTY_MIN, Math.min(QTY_MAX, n));
}

function toCartItem(product: Product, qty: number): CartItem {
  const price = Number((product as any).price) || 0;

  return {
    product,
    id: String((product as any).id),
    title: String((product as any).title ?? ""),
    price,
    category: (product as any).category,
    image: (product as any).image,
    description: (product as any).description,
    unitLabel: (product as any).unitLabel,
    discountPercent: (product as any).discountPercent,
    qty: clampQty(qty),
  };
}

function buildCatalogMap() {
  const map = new Map<string, Product>();
  for (const p of products) map.set(String((p as any).id), p);
  return map;
}

/**
 * Sanitização:
 * - remove ids inexistentes do catálogo
 * - dedup (soma qty)
 * - clampa qty
 * - reidrata campos do item a partir do catálogo (preço/título/imagem)
 */
function sanitizePersisted(items: { id: string; qty: number }[]): CartItem[] {
  const catalog = buildCatalogMap();
  const merged = new Map<string, number>();

  for (const raw of items) {
    const id = String((raw as any)?.id ?? "");
    if (!id) continue;
    const qty = clampQty((raw as any)?.qty ?? 1);
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }

  const next: CartItem[] = [];
  for (const [id, qtySum] of merged.entries()) {
    const p = catalog.get(id);
    if (!p) continue;
    next.push(toCartItem(p, clampQty(qtySum)));
  }

  return next;
}

/**
 * Persistência (debounce)
 */
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersistStr = "";
let hydrated = false;
let hydrationInFlight: Promise<void> | null = null;
let userMutationCounter = 0;

async function persistSnapshot(items: CartItem[]) {
  const payload: CartPersistedV1 = {
    v: 1,
    items: items.map((it) => ({ id: String(it.id), qty: clampQty(it.qty) })),
    updatedAt: new Date().toISOString(),
  };

  const str = JSON.stringify(payload);
  if (str === lastPersistStr) return;
  lastPersistStr = str;

  await AsyncStorage.setItem(CART_STORAGE_KEY, str);
}

function schedulePersist(items: CartItem[]) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistSnapshot(items).catch(() => {
      // silencioso
    });
  }, 80);
}

function setItems(next: CartItem[], opts?: { source?: "user" | "hydrate"; persist?: boolean }) {
  state.items = next;
  emit();

  if (opts?.source === "user") userMutationCounter += 1;

  const shouldPersist = opts?.persist ?? true;
  if (shouldPersist) schedulePersist(next);
}

/**
 * Seed DEV (somente em desenvolvimento):
 * - Injeta 6 itens do catálogo para teste do Carrinho ( + / - / remover / cupons / frete )
 * - Roda apenas se NÃO existir carrinho persistido
 * - Roda apenas 1x por instalação (chave própria)
 */
async function maybeSeedCartForDevWhenEmpty() {
  if (!__DEV__) return;

  try {
    const already = await AsyncStorage.getItem(CART_DEV_SEEDED_KEY);
    if (already === "1") return;

    const pick = (id: string) => (products as Product[]).find((p) => String((p as any).id) === id);

    const list: Array<{ id: string; qty: number }> = [
      { id: "p-001", qty: 1 },
      { id: "p-002", qty: 1 },
      { id: "p-003", qty: 2 },
      { id: "p-004", qty: 1 },
      { id: "p-005", qty: 1 },
      { id: "p-006", qty: 2 },
    ];

    const next: CartItem[] = [];
    for (const it of list) {
      const p = pick(it.id);
      if (!p) continue;
      next.push(toCartItem(p, it.qty));
    }

    if (next.length === 0) return;

    setItems(next, { source: "hydrate", persist: true });
    await AsyncStorage.setItem(CART_DEV_SEEDED_KEY, "1");
  } catch {
    // silencioso
  }
}

/**
 * Hidratação pública (deduplicada)
 * - Correção B: não sobrescreve se houve mutação do usuário durante a hidratação
 */
export async function ensureCartHydrated() {
  if (hydrated) return;
  if (hydrationInFlight) return hydrationInFlight;

  const mutationAtStart = userMutationCounter;

  hydrationInFlight = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);

      // Caso 1: não existe snapshot salvo -> seed DEV (para conseguir testar o carrinho direto na aba)
      if (!raw) {
        if (userMutationCounter !== mutationAtStart) {
          hydrated = true;
          return;
        }

        await maybeSeedCartForDevWhenEmpty();
        hydrated = true;
        return;
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      let persistedItems: { id: string; qty: number }[] = [];

      if (parsed && typeof parsed === "object" && parsed.v === 1 && Array.isArray(parsed.items)) {
        persistedItems = parsed.items as any;
      } else if (Array.isArray(parsed)) {
        // migração simples (snapshot antigo)
        persistedItems = parsed as any;
      }

      const sanitized = sanitizePersisted(persistedItems);

      // se usuário mexeu durante hidratação, não sobrescreve
      if (userMutationCounter !== mutationAtStart) {
        hydrated = true;
        return;
      }

      setItems(sanitized, { source: "hydrate", persist: true });
      hydrated = true;
    } finally {
      hydrationInFlight = null;
    }
  })();

  return hydrationInFlight;
}

export async function clearCartStorage() {
  try {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
    // permite reseed no DEV se você quiser limpar e re-testar
    if (__DEV__) await AsyncStorage.removeItem(CART_DEV_SEEDED_KEY);
  } catch {
    // noop
  }
}

/**
 * Regras de negócio
 */
function upsert(product: Product, qtyDelta: number) {
  const pid = String((product as any).id);
  const current = state.items;
  const idx = current.findIndex((i) => String(i.id) === pid);

  if (idx === -1) {
    const initialQty = Math.max(QTY_MIN, clampQty(qtyDelta));
    setItems([...current, toCartItem(product, initialQty)], { source: "user" });
    return;
  }

  const rawNext = current[idx].qty + qtyDelta;
  if (rawNext <= 0) {
    setItems(current.filter((_, i) => i !== idx), { source: "user" });
    return;
  }

  const catalog = buildCatalogMap();
  const fresh = catalog.get(pid) ?? current[idx].product;
  const nextQty = clampQty(rawNext);

  setItems(current.map((it, i) => (i === idx ? { ...toCartItem(fresh, nextQty), qty: nextQty } : it)), {
    source: "user",
  });
}

function setQty(productId: string, qty: number) {
  const pid = String(productId);
  const q = clampQty(qty);

  const catalog = buildCatalogMap();
  const next = state.items
    .map((it) => {
      if (String(it.id) !== pid) return it;
      const fresh = catalog.get(pid) ?? it.product;
      return { ...toCartItem(fresh, q), qty: q };
    })
    .filter(Boolean);

  setItems(next, { source: "user" });
}

function remove(productId: string) {
  const pid = String(productId);
  setItems(state.items.filter((it) => String(it.id) !== pid), { source: "user" });
}

function clear() {
  setItems([], { source: "user" });
}

/**
 * Hook público
 */
export function useCart() {
  const [snap, setSnap] = useState<CartState>(() => getSnapshot());
  const [isHydrated, setIsHydrated] = useState<boolean>(() => hydrated);
  const hydratingRef = useRef(false);

  useEffect(() => {
    const unsub = subscribe(() => setSnap(getSnapshot()));
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated) {
      setIsHydrated(true);
      return;
    }
    if (hydratingRef.current) return;

    hydratingRef.current = true;
    void ensureCartHydrated()
      .then(() => setIsHydrated(true))
      .finally(() => {
        hydratingRef.current = false;
      });
  }, []);

  const totalQty = useMemo(() => snap.items.reduce((acc, it) => acc + clampQty(it.qty), 0), [snap.items]);

  const subtotal = useMemo(() => {
    return snap.items.reduce((acc, it) => {
      const price = Number(it.price);
      const qty = clampQty(it.qty);
      return acc + (Number.isFinite(price) ? price * qty : 0);
    }, 0);
  }, [snap.items]);

  const discountTotal = useMemo(() => {
    return snap.items.reduce((acc, it) => {
      const price = Number(it.price);
      const qty = clampQty(it.qty);
      const pct = Number(it.discountPercent ?? 0);
      if (!Number.isFinite(price) || !Number.isFinite(pct) || pct <= 0) return acc;
      const d = (price * pct) / 100;
      return acc + d * qty;
    }, 0);
  }, [snap.items]);

  const total = useMemo(() => {
    const t = subtotal - discountTotal;
    return t < 0 ? 0 : t;
  }, [subtotal, discountTotal]);

  const addItem = useCallback((product: Product, qtyDelta: number = 1) => upsert(product, qtyDelta), []);
  const decItem = useCallback((product: Product, qtyDelta: number = 1) => upsert(product, -Math.abs(qtyDelta)), []);
  const removeItem = useCallback((productId: string) => remove(productId), []);
  const setItemQty = useCallback((productId: string, qty: number) => setQty(productId, qty), []);
  const clearCart = useCallback(() => clear(), []);

  return {
    items: snap.items,
    hydrated: isHydrated,

    totalQty,
    subtotal,
    discountTotal,
    total,

    addItem,
    decItem,
    removeItem,
    setItemQty,
    clearCart,

    // alias compat
    setQty: setItemQty,
  };
}

/**
 * Provider guard (compat)
 * Observação: esse Provider é propositalmente "dummy" porque o store é singleton.
 */
const DummyCartContext = createContext(true);

export function CartProvider({ children }: { children: ReactNode }) {
  return <DummyCartContext.Provider value={true}>{children}</DummyCartContext.Provider>;
}

export function useCartProviderGuard() {
  return useContext(DummyCartContext);
}
