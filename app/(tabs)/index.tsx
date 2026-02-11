import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ProductCard } from "../../components/product-card";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { categories, products } from "../../constants/products";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

import { track } from "../../utils/analytics";

const FF_HOME_ACHADINHOS = process.env.EXPO_PUBLIC_FF_HOME_ACHADINHOS === "1";

// ✅ Guards definitivos (persistem enquanto o app estiver rodando)
let HOME_VIEW_TRACKED = false;
let ACHADINHOS_VIEW_TRACKED = false;
let ACHADINHOS_SCROLL_TRACKED = false;

export default function HomeScreen() {
  useCheckoutFailSafe();
  useOutboxAutoFlush();

  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("Todos");

  // throttle de busca (não precisa ser “global”)
  const lastSearchTrackTs = useRef(0);

  useEffect(() => {
    if (HOME_VIEW_TRACKED) return;
    HOME_VIEW_TRACKED = true;
    track("home_view", { screen: "home" });
  }, []);

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

  const achadinhos = useMemo(() => {
    const withBadge = products.filter((p) => Boolean(p.badge));
    const base = withBadge.length > 0 ? withBadge : products;
    return base.slice(0, 10);
  }, []);

  useEffect(() => {
    if (!FF_HOME_ACHADINHOS) return;
    if (ACHADINHOS_VIEW_TRACKED) return;
    if (!achadinhos.length) return;

    ACHADINHOS_VIEW_TRACKED = true;
    track("home_section_view", { section: "achadinhos", itemsCount: achadinhos.length });
  }, [achadinhos.length]);

  function onChangeQuery(next: string) {
    setQuery(next);

    // throttle simples (evita spam)
    const now = Date.now();
    if (now - lastSearchTrackTs.current < 900) return;
    lastSearchTrackTs.current = now;

    const q = next.trim();
    track("home_search_change", { queryLen: q.length, hasQuery: q.length > 0 });
  }

  function onSelectCategory(category: (typeof categories)[number]) {
    setSelectedCategory(category);
    track("home_category_select", { category });
  }

  function goProduct(productId: string, origin: "achadinhos" | "grid") {
    track("home_product_click", { origin, productId });
    router.push({ pathname: "/product/[id]", params: { id: productId } } as any);
  }

  return (
    <>
      <StatusBar style="light" />

      <ParallaxScrollView
        headerBackgroundColor={{ light: "#0E1720", dark: "#0E1720" }}
        headerImage={
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.headerBanner}
            contentFit="cover"
          />
        }
      >
        {/* ✅ DEFINITIVO:
            - sem “PLUGAISHOP” abaixo do banner
            - sem segundo banner duplicado */}
        <ThemedView style={styles.heroCard}>
          <View style={{ gap: 8 }}>
            <ThemedText type="subtitle">Kit rápido de vitrine</ThemedText>
            <ThemedText>
              Combine iluminação, organização e sinalização para deixar seu ponto de
              venda pronto em minutos.
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={styles.cta}>
                <ThemedText type="defaultSemiBold">Ver recomendações</ThemedText>
              </Pressable>
            </Link>
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
                  onPress={() => onSelectCategory(category)}
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

        {/* Etapa 2 — Achadinhos (FLAG) + Etapa 3 métricas */}
        {FF_HOME_ACHADINHOS && achadinhos.length > 0 ? (
          <ThemedView style={styles.achadinhosSection}>
            <View style={styles.achadinhosHeader}>
              <ThemedText type="subtitle">Achadinhos do Dia</ThemedText>
              <ThemedText style={styles.achadinhosHint}>Toque para ver detalhes</ThemedText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={() => {
                if (ACHADINHOS_SCROLL_TRACKED) return;
                ACHADINHOS_SCROLL_TRACKED = true;
                track("home_achadinhos_scroll", { itemsCount: achadinhos.length });
              }}
            >
              {achadinhos.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.achadinhoItem}
                  onPress={() => goProduct(String(product.id), "achadinhos")}
                >
                  <ProductCard product={product} />
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
        ) : null}

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <Pressable key={product.id} onPress={() => goProduct(String(product.id), "grid")}>
              <ProductCard product={product} />
            </Pressable>
          ))}

          {filteredProducts.length === 0 ? (
            <ThemedText>Não encontramos itens para sua busca.</ThemedText>
          ) : null}
        </View>

        <ThemedView style={styles.tip}>
          <ThemedText type="defaultSemiBold">Dica de uso</ThemedText>
          <ThemedText>
            {`Use o botão abaixo para testar ações rápidas e visualizar a navegação com opções contextuais.`}
          </ThemedText>

          <Link href="/modal">
            <Link.Trigger>
              <ThemedText type="link">Abrir menu de ações</ThemedText>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              <Link.MenuAction title="Solicitar demo" icon="cube" onPress={() => alert("Demo")} />
              <Link.MenuAction
                title="Compartilhar"
                icon="square.and.arrow.up"
                onPress={() => alert("Link copiado")}
              />
              <Link.Menu title="Mais" icon="ellipsis">
                <Link.MenuAction
                  title="Remover"
                  icon="trash"
                  destructive
                  onPress={() => alert("Item removido")}
                />
              </Link.Menu>
            </Link.Menu>
          </Link>
        </ThemedView>
      </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 12,
    marginTop: 12,
    backgroundColor: "#E6F4FE",
    padding: 16,
    borderRadius: 16,
  },

  cta: {
    marginTop: 8,
    backgroundColor: "#0a7ea4",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  searchSection: {
    gap: 12,
    marginTop: 16,
  },

  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },

  chipRow: {
    flexGrow: 0,
  },

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

  chipSelectedText: {
    color: "#fff",
  },

  grid: {
    marginTop: 16,
    gap: 12,
  },

  tip: {
    gap: 8,
    marginTop: 16,
  },

  headerBanner: {
    width: "100%",
    height: "100%",
  },

  achadinhosSection: {
    marginTop: 16,
    gap: 10,
  },

  achadinhosHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  achadinhosHint: {
    opacity: 0.7,
    fontSize: 12,
  },

  achadinhoItem: {
    width: 280,
    marginRight: 12,
  },
});
