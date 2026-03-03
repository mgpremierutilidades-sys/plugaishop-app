// app/(tabs)/index.tsx
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { isFlagEnabled } from "../../constants/flags";
import { categories, products } from "../../constants/products";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { track } from "../../lib/analytics";

// fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

function formatBRL(value: number) {
  const v = Number.isFinite(value) ? value : 0;
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

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

  // ===== Achadinhos (Ticket #27) =====
  const achadinhosEnabled = isFlagEnabled("ff_home_achadinhos_v1");
  const achadinhosViewedRef = useRef(false);

  const achadinhos = useMemo(() => {
    // Curadoria local: prioriza itens com badge, depois completa com os primeiros
    const withBadge = products.filter((p) => !!(p as any).badge);
    const rest = products.filter((p) => !(p as any).badge);

    const merged = [...withBadge, ...rest].slice(0, 8);
    return merged;
  }, []);

  useEffect(() => {
    if (!achadinhosEnabled) return;
    if (achadinhosViewedRef.current) return;
    if (!achadinhos.length) return;

    achadinhosViewedRef.current = true;
    try {
      track("home_achadinhos_viewed", { items_count: achadinhos.length });
    } catch {}
  }, [achadinhosEnabled, achadinhos.length]);

  function openAchadinho(productId: string, position: number) {
    try {
      track("home_achadinho_clicked", {
        product_id: String(productId),
        position,
      });
    } catch {}

    router.push({
      pathname: "/product/[id]" as any,
      params: { id: String(productId), source: "home" },
    } as any);
  }

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
                      {
                        color: isSelected
                          ? "#FFFFFF"
                          : isLight
                          ? "#0B1220"
                          : "#E5E7EB",
                      },
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
            {
              backgroundColor: isLight ? "#E6F4FE" : "#0B1220",
              borderColor: isLight ? "#DCEAF7" : "#1F2937",
            },
          ]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={[
                styles.heroTitle,
                { color: isLight ? "#0B1220" : "#F8FAFC" },
              ]}
            >
              Kit rápido de vitrine
            </Text>
            <Text
              style={[
                styles.heroDesc,
                { color: isLight ? "#334155" : "#CBD5E1" },
              ]}
            >
              Organização, sinalização e iluminação para vender mais com menos
              esforço.
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

        {/* Achadinhos do Dia (Ticket #27) */}
        {achadinhosEnabled ? (
          <View style={styles.achadinhosBlock}>
            <View style={styles.achadinhosHeader}>
              <Text
                style={[
                  styles.achadinhosTitle,
                  { color: isLight ? "#0B1220" : "#F8FAFC" },
                ]}
              >
                Achadinhos do Dia
              </Text>
              <Text
                style={[
                  styles.achadinhosMeta,
                  { color: isLight ? "#64748B" : "#94A3B8" },
                ]}
              >
                {achadinhos.length} sugestões
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achadinhosRow}
            >
              {achadinhos.map((p, idx) => (
                <Pressable
                  key={p.id}
                  onPress={() => openAchadinho(p.id, idx + 1)}
                  style={[
                    styles.achadinhoCard,
                    {
                      backgroundColor: isLight ? "#FFFFFF" : "#0B1220",
                      borderColor: isLight ? "#E2E8F0" : "#1F2937",
                    },
                  ]}
                >
                  <Image
                    source={{ uri: p.image }}
                    style={styles.achadinhoImage}
                    contentFit="cover"
                    transition={120}
                  />

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.achadinhoName,
                      { color: isLight ? "#0B1220" : "#F8FAFC" },
                    ]}
                  >
                    {p.name}
                  </Text>

                  <Text
                    style={[
                      styles.achadinhoPrice,
                      { color: isLight ? "#0A7EA4" : "#7AC4FF" },
                    ]}
                  >
                    {formatBRL(p.price)}
                  </Text>

                  {(p as any).badge ? (
                    <Text
                      style={[
                        styles.achadinhoBadge,
                        { color: isLight ? "#0B1220" : "#E5E7EB" },
                      ]}
                    >
                      {(p as any).badge}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Catálogo */}
        <View style={styles.catalogHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isLight ? "#0B1220" : "#F8FAFC" },
            ]}
          >
            Catálogo
          </Text>
          <Text
            style={[
              styles.sectionMeta,
              { color: isLight ? "#64748B" : "#94A3B8" },
            ]}
          >
            {filteredProducts.length} itens
          </Text>
        </View>

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

          {filteredProducts.length === 0 ? (
            <Text
              style={[
                styles.empty,
                { color: isLight ? "#64748B" : "#94A3B8" },
              ]}
            >
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

  achadinhosBlock: {
    marginTop: 14,
    gap: 10,
  },

  achadinhosHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  achadinhosTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  achadinhosMeta: {
    fontSize: 12,
    fontWeight: "700",
  },

  achadinhosRow: {
    gap: 10,
    paddingVertical: 2,
  },

  achadinhoCard: {
    width: 186,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },

  achadinhoImage: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    backgroundColor: "rgba(148,163,184,0.20)",
  },

  achadinhoName: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  achadinhoPrice: {
    fontSize: 13,
    fontWeight: "900",
  },

  achadinhoBadge: {
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.8,
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