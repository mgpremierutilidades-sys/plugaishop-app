// app/(tabs)/index.tsx
import { Image } from "expo-image";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ProductCard } from "../../components/product-card";
import { categories, products } from "../../constants/products";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

export default function HomeScreen() {
  useCheckoutFailSafe();
  useOutboxAutoFlush();

  const colorScheme = useColorScheme() ?? "light";
  const isLight = colorScheme === "light";

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("Todos");

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

  const headerBg = "#0E1720";

  return (
    <>
      <StatusBar style="light" />

      <ParallaxScrollView
        headerBackgroundColor={{ light: headerBg, dark: headerBg }}
        headerImage={
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.headerBanner}
            contentFit="cover"
            transition={120}
          />
        }
      >
        {/* Top compact (ML-like): headline curto + busca + chips */}
        <View style={styles.topBlock}>
          <Text style={[styles.h1, { color: isLight ? "#0B1220" : "#F8FAFC" }]}>
            Boas-vindas
          </Text>

          <Text style={[styles.p, { color: isLight ? "#475569" : "#CBD5E1" }]}>
            Descubra itens com foco em operação e vitrine — rápido e direto.
          </Text>

          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: isLight ? "#F1F5F9" : "#0B1220",
                borderColor: isLight ? "#E2E8F0" : "#1F2937",
              },
            ]}
          >
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput
              placeholder="Buscar por categoria ou produto"
              placeholderTextColor={isLight ? "#64748B" : "#94A3B8"}
              value={query}
              onChangeText={setQuery}
              style={[
                styles.searchInput,
                { color: isLight ? "#0B1220" : "#F8FAFC" },
              ]}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? "#0A7EA4"
                        : isLight
                        ? "#FFFFFF"
                        : "#0B1220",
                      borderColor: isSelected
                        ? "#0A7EA4"
                        : isLight
                        ? "#E2E8F0"
                        : "#1F2937",
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Categoria ${category}`}
                >
                  {/* IMPORTANTe: sem numberOfLines -> sem "..." */}
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? "#FFFFFF" : isLight ? "#0B1220" : "#E5E7EB" },
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Hero compacto, sem marca e sem banner-splash */}
        <View
          style={[
            styles.hero,
            { backgroundColor: isLight ? "#E6F4FE" : "#0B1220", borderColor: isLight ? "#DCEAF7" : "#1F2937" },
          ]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.heroTitle, { color: isLight ? "#0B1220" : "#F8FAFC" }]}>
              Kit rápido de vitrine
            </Text>
            <Text style={[styles.heroDesc, { color: isLight ? "#334155" : "#CBD5E1" }]}>
              Organização, sinalização e iluminação para vender mais com menos esforço.
            </Text>

            <View style={styles.heroActions}>
              <Link href="/explore" asChild>
                <Pressable style={styles.btnPrimary} accessibilityRole="button">
                  <Text style={styles.btnPrimaryText}>Ver recomendações</Text>
                </Pressable>
              </Link>

              <Link href="/cart" asChild>
                <Pressable style={styles.btnGhost} accessibilityRole="button">
                  <Text style={styles.btnGhostText}>Ir ao carrinho</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Elemento neutro (sem logo) para manter equilíbrio visual */}
          <View style={styles.heroNeutralBox} />
        </View>

        {/* Catálogo */}
        <View style={styles.catalogHeader}>
          <Text style={[styles.sectionTitle, { color: isLight ? "#0B1220" : "#F8FAFC" }]}>
            Catálogo
          </Text>
          <Text style={[styles.sectionMeta, { color: isLight ? "#64748B" : "#94A3B8" }]}>
            {filteredProducts.length} itens
          </Text>
        </View>

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

          {filteredProducts.length === 0 ? (
            <Text style={[styles.empty, { color: isLight ? "#64748B" : "#94A3B8" }]}>
              Não encontramos itens para sua busca.
            </Text>
          ) : null}
        </View>
      </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    width: "100%",
    height: "100%",
  },

  topBlock: {
    gap: 10,
    marginBottom: 10,
  },

  h1: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  p: {
    fontSize: 13,
    lineHeight: 18,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 44,
  },

  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },

  chipsRow: {
    paddingVertical: 2,
    gap: 8,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0, // evita compressão -> evita "..."
  },

  chipText: {
    fontSize: 13,
    fontWeight: "800",
  },

  hero: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  heroTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  btnPrimary: {
    backgroundColor: "#0A7EA4",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  btnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },

  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(148,163,184,0.15)",
  },

  btnGhostText: {
    color: "#0B1220",
    fontWeight: "900",
    fontSize: 13,
  },

  heroNeutralBox: {
    width: 74,
    height: 74,
    borderRadius: 18,
    backgroundColor: "rgba(148,163,184,0.25)",
  },

  catalogHeader: {
    marginTop: 14,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  sectionMeta: {
    fontSize: 13,
    fontWeight: "700",
  },

  grid: {
    marginTop: 10,
    gap: 12,
  },

  empty: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
  },
});
