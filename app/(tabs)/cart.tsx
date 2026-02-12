import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { track } from "../../lib/analytics";
import { formatCurrency } from "../../utils/formatCurrency";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

type Row = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  qty: number;
  image?: string;
};

type CartSection = {
  title: string;
  data: Row[];
};

function ProductThumb({ image, size = 72 }: { image?: string; size?: number }) {
  const src: ImageSourcePropType | null =
    typeof image === "string" && image.startsWith("http") ? { uri: image } : null;

  return (
    <View style={styles.itemImage}>
      {src ? (
        <Image
          source={src}
          style={{ width: size, height: size, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.itemImagePlaceholder} />
      )}
    </View>
  );
}

export default function CartTab() {
  const cartCtx = useCart() as any;

  // Lock por ação (anti double tap)
  const actionLocksRef = useRef<Record<string, number>>({});
  const ACTION_LOCK_MS = 250;

  const withActionLock = useCallback((key: string, fn: () => void) => {
    if (!isFlagEnabled("ff_cart_action_lock")) return fn();

    const now = Date.now();
    const last = actionLocksRef.current[key] ?? 0;

    if (now - last < ACTION_LOCK_MS) {
      if (isFlagEnabled("ff_cart_analytics_v1")) track("cart_double_action_prevented", { key });
      return;
    }

    actionLocksRef.current[key] = now;
    fn();
  }, []);

  // Fallback local (se carrinho estiver vazio / sem persistência ainda)
  const seededRows = useMemo<Row[]>(() => {
    const base = (products as Product[]).slice(0, 6);
    return base.map((p, idx) => ({
      type: "cart",
      id: p.id,
      title: p.title,
      price: p.price,
      oldPrice: idx % 2 === 0 ? Math.round(p.price * 1.18 * 100) / 100 : undefined,
      qty: 1 + (idx % 3),
      image: (p as any).image,
    }));
  }, []);

  const [localRows, setLocalRows] = useState<Row[]>(seededRows);

  useEffect(() => {
    if (isFlagEnabled("ff_cart_analytics_v1")) track("cart_view");
  }, []);

  // Reflete itens reais do carrinho (rehydration/persist)
  useEffect(() => {
    try {
      const ctxItems = cartCtx?.items ?? cartCtx?.cartItems ?? cartCtx?.cart ?? null;
      if (!ctxItems) return;

      if (Array.isArray(ctxItems)) {
        const mapped: Row[] = ctxItems
          .map((it: any) => {
            const p = it?.product ?? it;
            const qty = it?.qty ?? it?.quantity ?? 1;
            const id = p?.id ?? it?.id ?? it?.productId;
            if (!id) return null;

            return {
              type: "cart",
              id: String(id),
              title: String(p?.title ?? it?.title ?? "Produto"),
              price: Number(p?.price ?? it?.price ?? 0),
              oldPrice: p?.oldPrice ? Number(p.oldPrice) : undefined,
              qty: Math.max(1, Number(qty ?? 1)),
              image: p?.image ?? it?.image,
            } as Row;
          })
          .filter(Boolean) as Row[];

        if (mapped.length) setLocalRows(mapped);
      }
    } catch (e: any) {
      if (isFlagEnabled("ff_cart_analytics_v1")) {
        track("cart_rows_map_fail", { message: String(e?.message ?? e) });
      }
    }
  }, [cartCtx, seededRows]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // ✅ FIX invisível: preservar seleção ao mutar itens (não resetar tudo)
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const r of localRows) next[r.id] = prev[r.id] ?? true;
      return next;
    });
  }, [localRows]);

  function toProduct(row: Row): Product {
    const p = (products as Product[]).find((x) => x.id === row.id);
    return (
      p ?? {
        id: row.id,
        title: row.title,
        price: row.price,
        category: "",
        image: row.image ?? "",
      }
    );
  }

  function safeAdd(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.addItem?.bind(any) ||
      any?.add?.bind(any) ||
      any?.addToCart?.bind(any) ||
      any?.increase?.bind(any) ||
      any?.increment?.bind(any);

    withActionLock(`inc:${product.id}`, () => {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_item_increment", { item_id: String(product.id), delta: 1 });

      if (fn) return fn(product, 1);

      setLocalRows((prev) =>
        prev.map((r) => (r.id === product.id ? { ...r, qty: r.qty + 1 } : r))
      );
    });
  }

  function safeDec(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.decItem?.bind(any) ||
      any?.decrease?.bind(any) ||
      any?.dec?.bind(any) ||
      any?.decrement?.bind(any) ||
      any?.removeOne?.bind(any);

    withActionLock(`dec:${product.id}`, () => {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_item_decrement", { item_id: String(product.id), delta: 1 });

      if (fn) return fn(product, 1);

      setLocalRows((prev) =>
        prev
          .map((r) =>
            r.id === product.id ? { ...r, qty: Math.max(1, r.qty - 1) } : r
          )
          .filter((r) => r.qty > 0)
      );
    });
  }

  function safeRemove(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.removeItem?.bind(any) ||
      any?.remove?.bind(any) ||
      any?.removeFromCart?.bind(any) ||
      any?.deleteItem?.bind(any) ||
      any?.clearItem?.bind(any);

    withActionLock(`rm:${product.id}`, () => {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_item_remove", { item_id: String(product.id) });

      if (fn) return fn(product.id);

      setLocalRows((prev) => prev.filter((r) => r.id !== product.id));
    });
  }

  const selectedSubtotal = useMemo(() => {
    return localRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [localRows, selected]);

  const sections: CartSection[] = useMemo(() => {
    return [{ title: "Produtos", data: localRows }];
  }, [localRows]);

  const renderRow = ({ item }: { item: Row }) => {
    const checked = !!selected[item.id];
    const product = toProduct(item);

    return (
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <Pressable
            onPress={() =>
              withActionLock(`sel:${item.id}`, () => {
                setSelected((prev) => {
                  const next = { ...prev, [item.id]: !prev[item.id] };
                  if (isFlagEnabled("ff_cart_analytics_v1"))
                    track("cart_item_select_toggle", {
                      item_id: item.id,
                      selected: !!next[item.id],
                    });
                  return next;
                });
              })
            }
            hitSlop={10}
            style={[styles.check, checked ? styles.checkOn : styles.checkOff]}
          >
            {checked ? <View style={styles.dot} /> : null}
          </Pressable>

          <ProductThumb image={item.image} />

          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {item.title}
            </ThemedText>

            <View style={styles.priceRow}>
              <ThemedText style={styles.price}>{formatCurrency(item.price)}</ThemedText>
              <ThemedText style={styles.unit}> / un</ThemedText>
            </View>

            {item.oldPrice ? (
              <ThemedText style={styles.old}>{formatCurrency(item.oldPrice)}</ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.rowBottom}>
          <Pressable onPress={() => safeDec(product)} style={styles.qtyBtn} hitSlop={10}>
            <ThemedText style={styles.qtyBtnText}>-</ThemedText>
          </Pressable>

          <View style={styles.qtyPill}>
            <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>
          </View>

          <Pressable onPress={() => safeAdd(product)} style={styles.qtyBtn} hitSlop={10}>
            <ThemedText style={styles.qtyBtnText}>+</ThemedText>
          </Pressable>

          <Pressable onPress={() => safeRemove(product)} style={styles.removeBtn} hitSlop={10}>
            <ThemedText style={styles.remove}>Remover</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.h1}>Carrinho</ThemedText>
          <ThemedText style={styles.h2}>{localRows.length} itens</ThemedText>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          renderItem={renderRow}
          renderSectionHeader={() => null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.footerBar}>
          <View style={styles.totalBox}>
            <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
            <ThemedText style={styles.totalValue}>{formatCurrency(selectedSubtotal)}</ThemedText>
          </View>

          <Pressable
            onPress={() => {
              if (isFlagEnabled("ff_cart_analytics_v1")) track("cart_checkout_start");
              router.push("/(tabs)/checkout");
            }}
            style={styles.footerBtn}
          >
            <ThemedText style={styles.footerBtnText}>CONTINUAR</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  h1: { fontFamily: FONT_TITLE, fontSize: 26 },
  h2: { fontFamily: FONT_BODY, opacity: 0.75, marginTop: 2 },

  listContent: { paddingHorizontal: 14, paddingBottom: 120 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },

  check: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: "#16A34A" },
  checkOff: { borderWidth: 1, borderColor: theme.colors.divider },

  dot: { width: 10, height: 10, borderRadius: 4, backgroundColor: "#FFFFFF" },

  itemImage: { borderRadius: 12, overflow: "hidden" },
  itemImagePlaceholder: { width: 72, height: 72, borderRadius: 12, backgroundColor: theme.colors.divider },

  title: { fontFamily: FONT_BODY_BOLD, fontSize: 14 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  price: { fontFamily: FONT_BODY_BOLD, fontSize: 14 },
  unit: { fontFamily: FONT_BODY, fontSize: 12, opacity: 0.7 },
  old: { fontFamily: FONT_BODY, fontSize: 12, opacity: 0.55, textDecorationLine: "line-through", marginTop: 2 },

  rowBottom: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 },

  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 16 },

  qtyPill: {
    minWidth: 46,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
  },
  qtyText: { fontFamily: FONT_BODY_BOLD, minWidth: 18, textAlign: "center" },

  removeBtn: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 8 },
  remove: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.85 },

  footerBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    gap: 8,
  },

  totalBox: {
    backgroundColor: "#F59E0B",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000" },
  totalValue: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: "#000" },

  footerBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#3F5A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnText: {
    fontSize: 16,
    fontFamily: FONT_BODY_BOLD,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
});
