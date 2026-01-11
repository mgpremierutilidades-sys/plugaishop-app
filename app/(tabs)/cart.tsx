import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
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
    <View style={[styles.itemImage, { width: size, height: size }]}>
      {src ? (
        <Image
          source={src}
          style={{ width: "100%", height: "100%", borderRadius: 12 }}
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

  // Fallback local (para o caso do contexto ainda não estar 100% pronto)
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

  // Se o contexto expuser itens, tentamos refletir (sem depender do formato exato)
  useEffect(() => {
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
      return;
    }

    if (typeof ctxItems === "object") {
      const mapped: Row[] = Object.keys(ctxItems).map((id) => {
        const qty = Number((ctxItems as any)[id] ?? 1);
        const p = (products as Product[]).find((x) => String(x.id) === String(id));
        return {
          type: "cart",
          id: String(id),
          title: String(p?.title ?? "Produto"),
          price: Number(p?.price ?? 0),
          qty: Math.max(1, qty),
          image: (p as any)?.image,
        };
      });
      if (mapped.length) setLocalRows(mapped);
    }
  }, [cartCtx, seededRows]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const r of localRows) next[r.id] = true;
    setSelected(next);
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

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function safeAdd(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.addItem?.bind(any) ||
      any?.add?.bind(any) ||
      any?.addToCart?.bind(any) ||
      any?.increase?.bind(any) ||
      any?.increment?.bind(any);

    if (fn) {
      fn(product, 1);
      return;
    }

    setLocalRows((prev) => prev.map((r) => (r.id === product.id ? { ...r, qty: r.qty + 1 } : r)));
  }

  function safeDec(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.decItem?.bind(any) ||
      any?.decrease?.bind(any) ||
      any?.dec?.bind(any) ||
      any?.decrement?.bind(any) ||
      any?.removeOne?.bind(any);

    if (fn) {
      fn(product, 1);
      return;
    }

    setLocalRows((prev) =>
      prev
        .map((r) => (r.id === product.id ? { ...r, qty: Math.max(1, r.qty - 1) } : r))
        .filter((r) => r.qty > 0)
    );
  }

  function safeRemove(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.removeItem?.bind(any) ||
      any?.remove?.bind(any) ||
      any?.removeFromCart?.bind(any) ||
      any?.deleteItem?.bind(any) ||
      any?.clearItem?.bind(any);

    if (fn) {
      fn(product.id);
      return;
    }

    setLocalRows((prev) => prev.filter((r) => r.id !== product.id));
  }

  const selectedSubtotal = useMemo(() => {
    return localRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [localRows, selected]);

  const sections: CartSection[] = useMemo(() => {
    return [
      {
        title: "Produtos",
        data: localRows,
      },
    ];
  }, [localRows]);

  const renderRow = ({ item }: { item: Row }) => {
    const isChecked = !!selected[item.id];
    const product = toProduct(item);

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemTop}>
          <Pressable
            onPress={() => toggleSelect(item.id)}
            hitSlop={10}
            style={[styles.checkbox, isChecked ? styles.checkboxChecked : styles.checkboxUnchecked]}
            accessibilityRole="button"
            accessibilityLabel={isChecked ? "Desmarcar item" : "Marcar item"}
          >
            {isChecked ? <View style={styles.checkboxDot} /> : null}
          </Pressable>

          <ProductThumb image={item.image} />

          <View style={styles.itemInfo}>
            <ThemedText numberOfLines={2} style={styles.itemTitle}>
              {item.title}
            </ThemedText>

            <View style={styles.priceRow}>
              <ThemedText style={styles.price}>{formatCurrency(item.price)}</ThemedText>
              <ThemedText style={styles.unit}> / un</ThemedText>
            </View>

            {item.oldPrice ? (
              <ThemedText style={styles.oldPrice}>{formatCurrency(item.oldPrice)}</ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.qtyRow}>
          <Pressable onPress={() => safeDec(product)} style={styles.qtyBtn} hitSlop={10} accessibilityRole="button">
            <ThemedText style={styles.qtyBtnText}>-</ThemedText>
          </Pressable>

          <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>

          <Pressable onPress={() => safeAdd(product)} style={styles.qtyBtn} hitSlop={10} accessibilityRole="button">
            <ThemedText style={styles.qtyBtnText}>+</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => safeRemove(product)}
            hitSlop={10}
            accessibilityRole="button"
            style={{ marginLeft: "auto" }}
          >
            <ThemedText style={styles.remove}>✕</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  const goCheckout = () => {
    router.push("/checkout" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Carrinho</ThemedText>

          <View style={styles.rightSpacer} />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(it) => `${it.type}-${it.id}`}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionHeaderText}>{section.title.toUpperCase()}</ThemedText>
            </View>
          )}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
        />

        {/* Rodapé fixo: TOTAL embaixo + botão */}
        <View style={styles.footerBar}>
          <View style={styles.totalBox}>
            <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
            <ThemedText style={styles.totalValue}>{formatCurrency(selectedSubtotal)}</ThemedText>
          </View>

          <Pressable onPress={goCheckout} style={styles.footerBtn} accessibilityRole="button">
            <ThemedText style={styles.footerBtnText}>CONTINUAR A COMPRA</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },

  title: {
    fontSize: 24,
    fontFamily: FONT_TITLE,
    fontWeight: "700",
    textAlign: "center",
  },

  rightSpacer: { width: 40, height: 40 },

  // PRODUTOS fixo (sticky) e sempre visível
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  sectionHeaderText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.85 },

  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },

  itemTop: { flexDirection: "row", gap: 10 },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  checkboxUnchecked: { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  checkboxChecked: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  checkboxDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: "#fff" },

  itemImage: {
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  itemImagePlaceholder: { flex: 1, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt },

  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 11, fontFamily: FONT_BODY_BOLD },
  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  price: { fontSize: 11, fontFamily: FONT_BODY_BOLD, opacity: 0.9 },
  unit: { fontSize: 11, fontFamily: FONT_BODY, opacity: 0.7 },
  oldPrice: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: FONT_BODY,
    opacity: 0.6,
    textDecorationLine: "line-through",
  },

  qtyRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 15, fontFamily: FONT_BODY_BOLD },

  qtyText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, minWidth: 18, textAlign: "center" },

  remove: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.85 },

  // Rodapé: TOTAL + CTA
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
