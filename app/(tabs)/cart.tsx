// app/(tabs)/cart.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, SectionList, StyleSheet, View, type ImageSourcePropType } from "react-native";
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

// ==== Regras congeladas do Carrinho (teste/UX) ====
// - Total em box laranja com letra preta
// - Rodapé com banner verde musgo “Continuar a compra” (mais fino), texto 16 bold
const CTA_GREEN = "#3F5A3A";

type CartRow = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: ImageSourcePropType;
};

type DealRow = {
  type: "deal";
  id: string;
  title: string;
  price: number;
  image?: ImageSourcePropType;
};

type Row = CartRow | DealRow;

type CartSection = {
  title: string;
  data: Row[];
};

function toImageSource(img: any): ImageSourcePropType | undefined {
  if (!img) return undefined;
  if (typeof img === "number") return img;
  if (typeof img === "string") {
    if (img.startsWith("http")) return { uri: img };
    return undefined;
  }
  return img as ImageSourcePropType;
}

function findProductById(id: string) {
  return (products as Product[]).find((p) => String(p.id) === String(id));
}

export default function CartTab() {
  const cartCtx = useCart() as any;

  // ---- Lê itens do contexto com fallback robusto ----
  const cartRows: CartRow[] = useMemo(() => {
    const ctxItems = cartCtx?.items ?? cartCtx?.cartItems ?? cartCtx?.cart ?? null;

    // Formato A: array
    if (Array.isArray(ctxItems)) {
      const mapped = ctxItems
        .map((it: any) => {
          const p = it?.product ?? it;
          const qty = Number(it?.qty ?? it?.quantity ?? 1);
          const id = p?.id ?? it?.id ?? it?.productId;
          if (!id) return null;

          const price = Number(p?.price ?? it?.price ?? 0);
          const title = String(p?.title ?? it?.title ?? "Produto");
          const image = toImageSource(p?.image ?? it?.image);

          return {
            type: "cart",
            id: String(id),
            title,
            price,
            qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
            image,
          } as CartRow;
        })
        .filter(Boolean) as CartRow[];

      return mapped;
    }

    // Formato B: objeto { [id]: qty }
    if (ctxItems && typeof ctxItems === "object") {
      const mapped = Object.keys(ctxItems).map((id) => {
        const qty = Number((ctxItems as any)[id] ?? 1);
        const p = findProductById(String(id));
        return {
          type: "cart",
          id: String(id),
          title: String(p?.title ?? "Produto"),
          price: Number(p?.price ?? 0),
          qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
          image: toImageSource((p as any)?.image),
        } as CartRow;
      });
      return mapped;
    }

    // Sem contexto -> vazio (não inventa carrinho cheio)
    return [];
  }, [cartCtx]);

  const hasCart = cartRows.length > 0;

  // Checkbox: tudo marcado por padrão (igual estava)
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const r of cartRows) next[r.id] = true;
    setSelected(next);
  }, [cartRows]);

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function safeAdd(productId: string) {
    const p = findProductById(productId);
    if (!p) return;

    const any = cartCtx as any;
    const fn =
      any?.addItem?.bind(any) ||
      any?.add?.bind(any) ||
      any?.addToCart?.bind(any) ||
      any?.increase?.bind(any) ||
      any?.increment?.bind(any);

    if (fn) {
      fn(p, 1);
      return;
    }
  }

  function safeDec(productId: string) {
    const p = findProductById(productId);
    if (!p) return;

    const any = cartCtx as any;
    const fn =
      any?.decItem?.bind(any) ||
      any?.decrease?.bind(any) ||
      any?.dec?.bind(any) ||
      any?.decrement?.bind(any) ||
      any?.removeOne?.bind(any);

    if (fn) {
      fn(p, 1);
      return;
    }
  }

  function safeRemove(productId: string) {
    const any = cartCtx as any;
    const fn =
      any?.removeItem?.bind(any) ||
      any?.remove?.bind(any) ||
      any?.removeFromCart?.bind(any) ||
      any?.deleteItem?.bind(any) ||
      any?.clearItem?.bind(any);

    if (fn) {
      fn(productId);
      return;
    }
  }

  // ---- Produtos imperdíveis (sempre aparecem; garantem scroll) ----
  const dealRows: DealRow[] = useMemo(() => {
    // pega um bloco maior para garantir rolagem quando carrinho vazio
    const list = (products as Product[]).slice(0, 14);
    return list.map((p) => ({
      type: "deal",
      id: String(p.id),
      title: String(p.title),
      price: Number(p.price ?? 0),
      image: toImageSource((p as any).image),
    }));
  }, []);

  // ---- Totais (apenas do que está selecionado) ----
  const subtotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [cartRows, selected]);

  const total = subtotal; // carrinho aprovado aqui trabalha “simples”: subtotal = total (sem inventar frete/cupom)

  const sections: CartSection[] = useMemo(() => {
    return [
      { title: "Produtos", data: cartRows as Row[] },
      { title: "PRODUTOS IMPERDÍVEIS", data: dealRows as Row[] },
    ];
  }, [cartRows, dealRows]);

  function renderRow({ item }: { item: Row }) {
    if (item.type === "deal") {
      return (
        <Pressable
          onPress={() => router.push(`/product/${item.id}` as any)}
          style={styles.dealCard}
          accessibilityRole="button"
        >
          <View style={styles.dealImageWrap}>
            {item.image ? (
              <Image source={item.image} style={styles.dealImage} resizeMode="cover" />
            ) : (
              <View style={styles.dealImagePlaceholder} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText numberOfLines={2} style={styles.dealTitle}>
              {item.title}
            </ThemedText>

            <ThemedText style={styles.dealPrice}>{formatCurrency(item.price)}</ThemedText>
          </View>
        </Pressable>
      );
    }

    const isChecked = !!selected[item.id];

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

          <View style={styles.itemImageWrap}>
            {item.image ? (
              <Image source={item.image} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={styles.itemImagePlaceholder} />
            )}
          </View>

          <View style={styles.itemInfo}>
            <ThemedText numberOfLines={2} style={styles.itemTitle}>
              {item.title}
            </ThemedText>

            <View style={styles.priceRow}>
              <ThemedText style={styles.price}>{formatCurrency(item.price)}</ThemedText>
              <ThemedText style={styles.unit}> / un</ThemedText>
            </View>

            <View style={styles.qtyRow}>
              <Pressable onPress={() => safeDec(item.id)} style={styles.qtyBtn} hitSlop={10} accessibilityRole="button">
                <ThemedText style={styles.qtyBtnText}>-</ThemedText>
              </Pressable>

              <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>

              <Pressable onPress={() => safeAdd(item.id)} style={styles.qtyBtn} hitSlop={10} accessibilityRole="button">
                <ThemedText style={styles.qtyBtnText}>+</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => safeRemove(item.id)}
                hitSlop={10}
                accessibilityRole="button"
                style={{ marginLeft: "auto" }}
              >
                <ThemedText style={styles.remove}>✕</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

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
              <ThemedText style={styles.sectionHeaderText}>{section.title}</ThemedText>
            </View>
          )}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: hasCart ? 140 : 20 }}
          ListHeaderComponent={
            !hasCart ? (
              <View style={styles.emptyWrap}>
                <ThemedText style={styles.emptyTitle}>Seu carrinho está vazio</ThemedText>
                <ThemedText style={styles.emptyText}>Confira os produtos imperdíveis abaixo e adicione ao carrinho.</ThemedText>
                <Pressable
                  onPress={() => router.push("/(tabs)/explore" as any)}
                  style={styles.emptyBtn}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.emptyBtnText}>EXPLORAR OFERTAS</ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />

        {/* Rodapé fixo (somente quando tem carrinho) */}
        {hasCart ? (
          <View style={styles.footerBar}>
            <View style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
            </View>

            <Pressable onPress={() => router.push("/(tabs)/checkout" as any)} style={styles.ctaPrimary} accessibilityRole="button">
              <ThemedText style={styles.ctaPrimaryText}>Continuar a compra</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 14 },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  // Carrinho (regra especial: título 24 em negrito)
  title: { fontSize: 24, fontFamily: FONT_TITLE, fontWeight: "700", textAlign: "center", color: theme.colors.text },
  rightSpacer: { width: 40, height: 40 },

  sectionHeader: { paddingTop: 10, paddingBottom: 8, backgroundColor: theme.colors.background },
  sectionHeaderText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  // Card item do carrinho
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
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

  itemImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  itemImage: { width: "100%", height: "100%" },
  itemImagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceAlt },

  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  price: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  unit: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text }, // “/ un” em negrito (regra)

  qtyRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },

  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  qtyBtnText: { fontSize: 15, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  qtyText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, minWidth: 18, textAlign: "center", color: theme.colors.text },
  remove: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(0,0,0,0.55)" },

  // Vazio
  emptyWrap: {
    marginTop: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 14,
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 13, fontFamily: FONT_BODY_BOLD, color: theme.colors.text, marginBottom: 6 },
  emptyText: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)", marginBottom: 12 },
  emptyBtn: { height: 42, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  emptyBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  // Imperdíveis (card simples, padrão marketplace)
  dealCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
    alignItems: "center",
  },
  dealImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  dealImage: { width: "100%", height: "100%" },
  dealImagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceAlt },
  dealTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  dealPrice: { marginTop: 6, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },

  // Rodapé fixo (sem TabBar no carrinho)
  footerBar: { position: "absolute", left: 14, right: 14, bottom: 10, gap: 8 },

  totalBox: {
    backgroundColor: "#F59E0B",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  totalLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000" }, // “Total” em negrito (regra)
  totalValue: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: "#000" },

  // Banner verde musgo (mais fino), texto 16 bold (regra)
  ctaPrimary: {
    height: 44,
    borderRadius: 14,
    backgroundColor: CTA_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimaryText: { fontSize: 16, fontFamily: FONT_BODY_BOLD, color: "#FFFFFF" },
});
