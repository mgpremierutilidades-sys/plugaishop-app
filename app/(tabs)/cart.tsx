// app/(tabs)/cart.tsx
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { formatCurrency } from "../../utils/formatCurrency";

type CartRow = {
  id: string;
  title: string;
  price: number;
  category?: string;
  image?: string;
  qty: number;
};

type CartSection = { title: string; data: CartRow[] };

function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={[styles.checkbox, checked ? styles.checkboxChecked : styles.checkboxUnchecked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked ? <View style={styles.checkboxDot} /> : null}
    </Pressable>
  );
}

function ProductThumb({ image, title }: { image?: string; title: string }) {
  if (image && /^https?:\/\//i.test(image)) {
    return <Image source={{ uri: image }} style={styles.thumbImg} />;
  }

  const initials = (title || "P")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <View style={styles.thumbPlaceholder}>
      <ThemedText style={styles.thumbInitials}>{initials}</ThemedText>
    </View>
  );
}

export default function CartTab() {
  // OBS: não somar insets.top manualmente no container se já usa SafeAreaView.
  // Isso estava jogando "Carrinho" pra baixo no iPhone.
  const cart = useCart() as any; // mantém compatível com CartContext atual (string OU Product)
  const items = (cart?.items ?? []) as Array<{ product: Product; qty: number }>;

  const addItem = cart?.addItem as ((arg: any) => void) | undefined;
  const decItem = cart?.decItem as ((arg: any) => void) | undefined;
  const removeItem = cart?.removeItem as ((arg: any) => void) | undefined;

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const it of items) {
        const id = it.product.id;
        if (next[id] === undefined) next[id] = true;
      }
      Object.keys(next).forEach((id) => {
        if (!items.some((x) => x.product.id === id)) delete next[id];
      });
      return next;
    });
  }, [items]);

  // Helpers: chamam tanto CartContext que espera Product quanto o que espera string (id)
  const safeAdd = (p: Product) => {
    if (!addItem) return;
    try {
      addItem(p);
    } catch {
      addItem(p.id);
    }
  };

  const safeDec = (p: Product) => {
    if (!decItem) return;
    try {
      decItem(p);
    } catch {
      decItem(p.id);
    }
  };

  const safeRemove = (p: Product) => {
    if (!removeItem) return;
    try {
      removeItem(p);
    } catch {
      removeItem(p.id);
    }
  };

  const sections: CartSection[] = useMemo(() => {
    const byCat = new Map<string, CartRow[]>();

    items.forEach((it) => {
      const cat = it.product.category?.trim() || "Produtos";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push({
        id: it.product.id,
        title: it.product.title,
        price: Number(it.product.price || 0),
        category: it.product.category,
        image: (it.product as any).image,
        qty: it.qty,
      });
    });

    return Array.from(byCat.entries()).map(([title, data]) => ({ title, data }));
  }, [items]);

  const selectedSubtotal = useMemo(() => {
    return items.reduce((acc, it) => {
      if (!selected[it.product.id]) return acc;
      return acc + Number(it.product.price || 0) * it.qty;
    }, 0);
  }, [items, selected]);

  const imperdiveis = useMemo(() => {
    const inCart = new Set(items.map((i) => i.product.id));
    return products.filter((p) => !inCart.has(p.id)).slice(0, 8);
  }, [items]);

  const toggleSelect = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));

  const toProduct = (row: CartRow): Product => ({
    id: row.id,
    title: row.title,
    price: row.price,
    category: row.category,
    image: row.image,
  });

  const empty = items.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        {/* Cabeçalho (compacto estilo marketplace) */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Carrinho</ThemedText>

          <Pressable style={styles.addressRow} hitSlop={10} accessibilityRole="button">
            <ThemedText style={styles.addressIcon}>📍</ThemedText>
            <ThemedText numberOfLines={1} style={styles.addressText}>
              Rua P 30 250
            </ThemedText>
            <ThemedText style={styles.addressChevron}>›</ThemedText>
          </Pressable>
        </View>

        {empty ? (
          <View style={styles.emptyWrap}>
            <ThemedText style={styles.emptyTitle}>Seu carrinho está vazio</ThemedText>

            <ThemedText style={styles.blockTitle}>PRODUTOS IMPERDÍVEIS</ThemedText>

            <View style={styles.grid}>
              {imperdiveis.map((p) => (
                <View key={p.id} style={styles.card}>
                  <ProductThumb title={p.title} image={(p as any).image} />
                  <ThemedText numberOfLines={2} style={styles.cardTitle}>
                    {p.title}
                  </ThemedText>
                  <ThemedText style={styles.cardPrice}>{formatCurrency(p.price)}</ThemedText>

                  <Pressable onPress={() => safeAdd(p)} style={styles.cardBtn}>
                    <ThemedText style={styles.cardBtnText}>Adicionar</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(it) => it.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionHeaderText}>
                  Produtos de {section.title.toUpperCase()}
                </ThemedText>
              </View>
            )}
            renderItem={({ item }) => {
              const isChecked = !!selected[item.id];
              const product = toProduct(item);

              return (
                <View style={styles.row}>
                  <Checkbox checked={isChecked} onPress={() => toggleSelect(item.id)} />

                  <ProductThumb image={item.image} title={item.title} />

                  <View style={styles.info}>
                    <ThemedText numberOfLines={2} style={styles.rowTitle}>
                      {item.title}
                    </ThemedText>

                    <View style={styles.priceRow}>
                      <ThemedText style={styles.price}>{formatCurrency(item.price)}</ThemedText>
                      <ThemedText style={styles.unit}> / un</ThemedText>
                    </View>

                    <View style={styles.bottomRow}>
                      <View style={styles.qty}>
                        <Pressable onPress={() => safeDec(product)} style={styles.qtyBtn}>
                          <ThemedText style={styles.qtyBtnText}>−</ThemedText>
                        </Pressable>

                        <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>

                        <Pressable onPress={() => safeAdd(product)} style={styles.qtyBtn}>
                          <ThemedText style={styles.qtyBtnText}>+</ThemedText>
                        </Pressable>
                      </View>

                      <Pressable onPress={() => safeRemove(product)} hitSlop={10}>
                        <ThemedText style={styles.remove}>🗑</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              <View style={styles.footerBlock}>
                {/* Barra de Total + Botão */}
                <View style={styles.totalBar}>
                  <View>
                    <ThemedText style={styles.totalLabel}>Total</ThemedText>
                    <ThemedText style={styles.totalValue}>{formatCurrency(selectedSubtotal)}</ThemedText>
                  </View>

                  <Pressable style={styles.continueBtn} accessibilityRole="button">
                    <ThemedText style={styles.continueText}>CONTINUAR A COMPRA</ThemedText>
                  </Pressable>
                </View>

                {/* Produtos Imperdíveis */}
                <ThemedText style={styles.blockTitle}>PRODUTOS IMPERDÍVEIS</ThemedText>

                <View style={styles.grid}>
                  {imperdiveis.map((p) => (
                    <View key={p.id} style={styles.card}>
                      <ProductThumb title={p.title} image={(p as any).image} />
                      <ThemedText numberOfLines={2} style={styles.cardTitle}>
                        {p.title}
                      </ThemedText>
                      <ThemedText style={styles.cardPrice}>{formatCurrency(p.price)}</ThemedText>

                      <Pressable onPress={() => safeAdd(p)} style={styles.cardBtn}>
                        <ThemedText style={styles.cardBtnText}>Adicionar</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </View>

                <View style={{ height: 18 }} />
              </View>
            }
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  // paddingTop pequeno (SafeAreaView já cuida do topo)
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 8, backgroundColor: theme.colors.background },

  header: { paddingBottom: 10 },

  // Ajuste de tipografia (mais “marketplace”, sem estourar no iOS)
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  addressIcon: { fontSize: 12 },
  addressText: { flex: 1, fontSize: 12, fontWeight: "800" },
  addressChevron: { fontSize: 16, fontWeight: "900", opacity: 0.6 },

  listContent: { paddingBottom: 14 },

  sectionHeader: { marginTop: 8, marginBottom: 6 },
  sectionHeaderText: { fontSize: 12, fontWeight: "900", opacity: 0.8 },

  row: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignItems: "flex-start",
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  checkboxUnchecked: { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  checkboxChecked: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  checkboxDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: "#fff" },

  thumbImg: { width: 56, height: 56, borderRadius: 12 },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSoft,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbInitials: { fontWeight: "900", fontSize: 12, opacity: 0.8 },

  info: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: "900" },

  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  price: { fontSize: 13, fontWeight: "900" },
  unit: { fontSize: 12, opacity: 0.7 },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  qty: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 18, fontWeight: "900" },
  qtyText: { minWidth: 18, textAlign: "center", fontSize: 13, fontWeight: "900" },

  remove: { fontSize: 16, opacity: 0.8 },

  footerBlock: { marginTop: 6 },

  totalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  totalLabel: { fontSize: 12, opacity: 0.8, fontWeight: "800" },
  totalValue: { fontSize: 16, fontWeight: "900" },

  continueBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  blockTitle: { fontSize: 13, fontWeight: "900", marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 12,
  },
  cardTitle: { marginTop: 8, fontSize: 12, fontWeight: "900" },
  cardPrice: { marginTop: 6, fontSize: 12, fontWeight: "900", opacity: 0.9 },
  cardBtn: {
    marginTop: 10,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  emptyWrap: { flex: 1, paddingTop: 10 },
  emptyTitle: { fontSize: 14, fontWeight: "900", marginBottom: 14 },
});
