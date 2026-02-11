// app/(tabs)/index.tsx
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ProductCard } from "../../components/product-card";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { categories, products } from "../../constants/products";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

/**
 * HOME BRAND LOCK (definitivo):
 * - A Home pode ter APENAS 1 bloco de marca: o banner do topo.
 * - Não repetir "PLUGAISHOP" como título logo abaixo.
 * - Não usar imagens com logo no meio do conteúdo (ex.: banner-splash na heroCard).
 */

export default function HomeScreen() {
  useCheckoutFailSafe();
  useOutboxAutoFlush();

  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("Todos");

  const lastSearchTrackTs = useRef(0);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "Todos" || product.category === selectedCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  function onChangeQuery(next: string) {
    setQuery(next);

    // throttle básico (mantém estável e evita spam)
    const now = Date.now();
    if (now - lastSearchTrackTs.current < 900) return;
    lastSearchTrackTs.current = now;
  }

  function goProduct(productId: string) {
    router.push({ pathname: "/product/[id]", params: { id: productId } } as any);
  }

  return (
    <>
      <StatusBar style="light" />

      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ ÚNICO bloco de marca */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/banners/banner-home.png")}
              style={styles.headerBanner}
              contentFit="cover"
            />
          </View>

          {/* ✅ Começa conteúdo (sem repetir logo/nome) */}
          <ThemedView style={styles.intro}>
            <ThemedText type="subtitle">Boas-vindas 👋</ThemedText>
            <ThemedText>
              Soluções curadas para acelerar a operação e o varejo inteligente.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.heroCard}>
            <View style={{ flex: 1, gap: 8 }}>
              <ThemedText type="subtitle">Kit rápido de vitrine</ThemedText>
              <ThemedText>
                Combine iluminação, organização e sinalização para deixar seu ponto de venda pronto
                em minutos.
              </ThemedText>

              <Link href="/explore" asChild>
                <Pressable style={styles.cta}>
                  <ThemedText type="defaultSemiBold">Ver recomendações</ThemedText>
                </Pressable>
              </Link>
            </View>

            {/* ✅ Sem “banner da empresa no meio”. Mantemos um bloco neutro. */}
            <View style={styles.heroNeutralBox}>
              <ThemedText type="defaultSemiBold">Destaque</ThemedText>
              <ThemedText style={styles.heroNeutralHint}>Conteúdo do dia</ThemedText>
            </View>
          </ThemedView>

          <ThemedView style={styles.searchSection}>
            <ThemedText type="subtitle">Catálogo PlugaiShop</ThemedText>

            <TextInput
              placeholder="Buscar por categoria ou produto"
              placeholderTextColor={colorScheme === "light" ? "#6B7280" : "#9CA3AF"}
              value={query}
              onChangeText={onChangeQuery}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colorScheme === "light" ? "#F3F4F6" : "#111315",
                  borderColor: colorScheme === "light" ? "#E5E7EB" : "#2A2F38",
                  color: colorScheme === "light" ? "#111827" : "#F9FAFB",
                },
              ]}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <ThemedText style={isSelected ? styles.chipSelectedText : undefined}>
                      {category}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </ThemedView>

          <View style={styles.grid}>
            {filteredProducts.map((product) => (
              <Pressable key={product.id} onPress={() => goProduct(String(product.id))}>
                <ProductCard product={product} />
              </Pressable>
            ))}

            {filteredProducts.length === 0 ? (
              <ThemedText>Não encontramos itens para sua busca.</ThemedText>
            ) : null}
          </View>

          <ThemedView style={styles.tip}>
            <ThemedText type="defaultSemiBold">Dica de uso</ThemedText>
            <ThemedText>{`Use o botão abaixo para testar a navegação.`}</ThemedText>

            <Link href="/modal" asChild>
              <Pressable>
                <ThemedText type="link">Abrir ações</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>

          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },

  header: {
    height: 220,
    backgroundColor: "#0E1720",
  },
  headerBanner: {
    width: "100%",
    height: "100%",
  },

  intro: {
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  heroCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#E6F4FE",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
  },

  heroNeutralBox: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: "#0E1720",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 6,
  },
  heroNeutralHint: {
    opacity: 0.75,
    fontSize: 12,
  },

  cta: {
    marginTop: 8,
    backgroundColor: "#0a7ea4",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  searchSection: {
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },

  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },

  chipRow: { flexGrow: 0 },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  chipSelectedText: { color: "#fff" },

  grid: {
    marginTop: 16,
    gap: 12,
    paddingHorizontal: 16,
  },

  tip: {
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
  },
});
