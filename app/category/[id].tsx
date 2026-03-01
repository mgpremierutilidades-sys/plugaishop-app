import { Stack, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import theme from "../../constants/theme";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { track } from "../../lib/analytics";
import { formatCurrency } from "../../utils/formatCurrency";

function normalizeCategory(name: string) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const categoryId = String(params?.id ?? "").trim();

  const filtered = useMemo<Product[]>(() => {
    if (!categoryId) return [];

    return (products as Product[]).filter((p) => {
      const raw = String(p?.category ?? "").trim();
      if (!raw) return false;
      return normalizeCategory(raw) === categoryId;
    });
  }, [categoryId]);

  const title = useMemo(() => {
    if (!categoryId) return "Categoria";
    // tenta recuperar um nome “humano” a partir de algum item filtrado
    const first = filtered[0];
    const raw = String(first?.category ?? "").trim();
    return raw || "Categoria";
  }, [categoryId, filtered]);

  useEffect(() => {
    if (!categoryId) return;
    try {
      track("category_viewed", { category_id: categoryId, items_count: filtered.length });
    } catch {}
  }, [categoryId, filtered.length]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sem itens nesta categoria</Text>
            <Text style={styles.emptySub}>
              Tente outra categoria no Explorar.
            </Text>

            <Pressable
              onPress={() => router.push("/(tabs)/explore")}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>Voltar para Explorar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((p) => (
              <Pressable
                key={String(p.id)}
                style={styles.card}
                onPress={() => {
                  try {
                    track("category_product_clicked", {
                      category_id: categoryId,
                      product_id: String(p.id),
                    });
                  } catch {}

                  const pid = String(p.id);
                  router.push(
                    `/product/${encodeURIComponent(pid)}?source=${encodeURIComponent(
                      "category",
                    )}`,
                  );
                }}
              >
                <Image
                  source={{ uri: String(p.image ?? "") }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {String(p.title ?? "Produto")}
                </Text>
                <Text style={styles.price}>
                  {formatCurrency(Number(p.price ?? 0))}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: theme.colors.background,
    flexGrow: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },

  card: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  image: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.surfaceAlt,
  },

  cardTitle: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 6,
  },

  price: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "700",
  },

  emptyBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 8,
  },

  emptyTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  emptySub: { fontSize: 12, opacity: 0.7, color: theme.colors.text },

  emptyCta: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#0a7ea4",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  emptyCtaText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});