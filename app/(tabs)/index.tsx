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
 * - Não usar imagens com logo no meio do conteúdo.
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

  const inputColors =
    colorScheme === "light"
      ? { bg: "#F3F4F6", border: "#E5E7EB", text: "#111827", placeholder: "#6B7280" }
      : { bg: "#111315", border: "#2A2F38", text: "#F9FAFB", placeholder: "#9CA3AF" };

  return (
    <>
      <StatusBar style="light" />

      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ✅ ÚNICO bloco de marca */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/banners/banner-home.png")}
              style={styles.headerBanner}
              contentFit="cover"
            />
          </View>

          {/* ✅ Conteúdo enxuto (ML density) */}
          <ThemedView style={styles.intro}>
            <ThemedText style={styles.h2}>Boas-vindas 👋</ThemedText>
            <ThemedText style={styles.p}>
              Soluções curadas para acelerar a operação e o varejo inteligente.
            </ThemedText>
          </ThemedView>

          {/* Hero compacto (sem logo no meio / sem preto) */}
          <ThemedView style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.h3}>Kit rápido de vitrine</ThemedText>
              <ThemedText style={[styles.p, { marginTop: 4 }]} numberOfLines={3}>
                Combine iluminação, organização e sinalização para deixar seu ponto de venda pronto em
                minutos.
              </ThemedText>

              <Link href="/explore" asChild>
                <Pressable style={styles.cta}>
                  <ThemedText style={styles.ctaText}>Ver recomendações</ThemedText>
                </Pressable>
              </Link>
            </View>

            {/* ✅ Destaque neutro premium (sem preto chapado, sem logo) */}
            <View style={styles.heroSpot}>
              <View style={styles.heroDot} />
              <ThemedText style={styles.heroSpotTitle}>Destaque</ThemedText>
              <ThemedText style={styles.heroSpotSub}>Do dia</ThemedText>
            </View>
          </ThemedView>

          {/* Busca + chips compactos */}
          <ThemedView style={styles.searchSection}>
            <ThemedText style={styles.h3}>Catálogo</ThemedText>

            <TextInput
              placeholder="Buscar por categoria ou produto"
              placeholderTextColor={inputColors.placeholder}
              value={query}
              onChangeText={onChangeQuery}
              style={[
                styles.searchInput,
                {
                  backgroundColor: inputColors.bg,
                  borderColor: inputColors.border,
                  color: inputColors.text,
                },
              ]}
              returnKeyType="search"
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
                    <ThemedText style={[styles.chipText, isSelected && styles.chipSelectedText]}>
                      {category}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </ThemedView>

          {/* Grid mais denso */}
          <View style={styles.grid}>
            {filteredProducts.map((product) => (
              <Pressable key={product.id} onPress={() => goProduct(String(product.id))}>
                <ProductCard product={product} />
              </Pressable>
            ))}

            {filteredProducts.length === 0 ? (
              <ThemedText style={styles.p}>Não encontramos itens para sua busca.</ThemedText>
            ) : null}
          </View>

          {/* Dica enxuta */}
          <ThemedView style={styles.tip}>
            <ThemedText style={styles.tipTitle}>Dica</ThemedText>
            <ThemedText style={styles.p}>Use “Explorar” para achar coleções e atalhos.</ThemedText>

            <Link href="/modal" asChild>
              <Pressable style={styles.tipLink}>
                <ThemedText style={styles.tipLinkText}>Abrir ações</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>

          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 22 },

  // Header (marca única)
  header: { height: 210, backgroundColor: "#0E1720" },
  headerBanner: { width: "100%", height: "100%" },

  // Tipografia ML density (local, sem afetar app inteiro)
  h2: { fontSize: 18, fontWeight: "900", lineHeight: 22 },
  h3: { fontSize: 14, fontWeight: "900", lineHeight: 18 },
  p: { fontSize: 12.5, lineHeight: 17 },

  intro: {
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
  },

  heroCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#E6F4FE",
    padding: 12, // ↓ 16
    borderRadius: 14, // ↓ 16
    marginHorizontal: 14,
  },

  cta: {
    marginTop: 8,
    backgroundColor: "#0a7ea4",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  ctaText: { color: "#fff", fontSize: 12.5, fontWeight: "900" },

  // destaque sem “quadrado preto”
  heroSpot: {
    width: 92,
    height: 92,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.15)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 6,
  },
  heroDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#0a7ea4",
    marginBottom: 2,
  },
  heroSpotTitle: { fontSize: 12.5, fontWeight: "900" },
  heroSpotSub: { fontSize: 11.5, fontWeight: "800", opacity: 0.75 },

  searchSection: {
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
  },

  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13.5, // ↓ 16
  },

  chipRow: { flexGrow: 0 },

  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    marginRight: 8,
    backgroundColor: "transparent",
  },
  chipSelected: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  chipText: { fontSize: 12, fontWeight: "800" },
  chipSelectedText: { color: "#fff" },

  grid: {
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 14,
  },

  tip: {
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
  },
  tipTitle: { fontSize: 12.5, fontWeight: "900" },
  tipLink: { paddingVertical: 6, alignSelf: "flex-start" },
  tipLinkText: { fontSize: 12.5, fontWeight: "900", color: "#0a7ea4" },
});
