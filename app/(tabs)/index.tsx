import { Image } from "expo-image";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
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

const FF_HOME_ACHADINHOS = process.env.EXPO_PUBLIC_FF_HOME_ACHADINHOS === "1";

export default function HomeScreen() {
  useCheckoutFailSafe();
  useOutboxAutoFlush();

  const colorScheme = useColorScheme() ?? "light";
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

  const achadinhos = useMemo(() => {
    // seleção determinística (sem random) pra não “piscar” em re-render
    const withBadge = products.filter((p) => Boolean(p.badge));
    const base = withBadge.length > 0 ? withBadge : products;
    return base.slice(0, 10);
  }, []);

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
            - remove bloco "PLUGAISHOP" abaixo do banner
            - remove segundo banner (heroImage) para não duplicar */}
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
            onChangeText={setQuery}
            style={[
              styles.searchInput,
              {
                backgroundColor: colorScheme === "light" ? "#F3F4F6" : "#111315",
                borderColor: colorScheme === "light" ? "#E5E7EB" : "#2A2F38",
                color: colorScheme === "light" ? "#111827" : "#F9FAFB",
              },
            ]}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
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

        {/* =========================
            Etapa 2 — Achadinhos do Dia (FLAG)
           ========================= */}
        {FF_HOME_ACHADINHOS && achadinhos.length > 0 ? (
          <ThemedView style={styles.achadinhosSection}>
            <View style={styles.achadinhosHeader}>
              <ThemedText type="subtitle">Achadinhos do Dia</ThemedText>
              <ThemedText style={styles.achadinhosHint}>Toque para ver detalhes</ThemedText>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {achadinhos.map((product) => (
                <Link
                  key={product.id}
                  href={{
                    pathname: "/product/[id]",
                    params: { id: String(product.id) },
                  }}
                  asChild
                >
                  <Pressable style={styles.achadinhoItem}>
                    <ProductCard product={product} />
                  </Pressable>
                </Link>
              ))}
            </ScrollView>
          </ThemedView>
        ) : null}

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
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
