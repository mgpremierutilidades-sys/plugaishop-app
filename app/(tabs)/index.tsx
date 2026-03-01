import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ProductCard } from "../../components/product-card";
import { ReviewList } from "../../components/reviews/review-list";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { isFlagEnabled } from "../../constants/flags";
import { categories, products } from "../../constants/products";
import { reviews } from "../../data/reviews";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

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

  const ffVerified = isFlagEnabled("ff_reviews_verified_purchase_v1");

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
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Boas-vindas</ThemedText>
          <ThemedText type="bodySmall">
            Soluções curadas para acelerar a operação e o varejo inteligente.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.heroCard}>
          <View style={{ flex: 1, gap: 6 }}>
            <ThemedText type="subtitle">Kit rápido de vitrine</ThemedText>
            <ThemedText type="bodySmall">
              Combine iluminação, organização e sinalização para deixar seu
              ponto de venda pronto em minutos.
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={styles.cta}>
                <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                  Ver recomendações
                </ThemedText>
              </Pressable>
            </Link>
          </View>

          <View style={styles.heroPlaceholder}>
            <View style={styles.heroLine} />
            <View style={[styles.heroLine, { width: 54 }]} />
            <View style={[styles.heroLine, { width: 42 }]} />
          </View>
        </ThemedView>

        {/* Reviews (TICK-0002) */}
        <ThemedView>
          <ReviewList
            reviews={reviews}
            enableVerifiedFilter={ffVerified}
            enableVerifiedBadge={ffVerified}
          />
        </ThemedView>

        <ThemedView style={styles.searchSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="sectionTitle">Catálogo</ThemedText>
            <ThemedText type="caption">{filteredProducts.length} itens</ThemedText>
          </View>

          <TextInput
            placeholder="Buscar por categoria ou produto"
            placeholderTextColor={
              colorScheme === "light" ? "#6B7280" : "#9CA3AF"
            }
            value={query}
            onChangeText={setQuery}
            onFocus={() => {
              // ISSUE #55: a busca “vive” em /search
              router.push("/search");
            }}
            style={[
              styles.searchInput,
              {
                backgroundColor:
                  colorScheme === "light" ? "#F3F4F6" : "#111315",
                borderColor: colorScheme === "light" ? "#E5E7EB" : "#2A2F38",
                color: colorScheme === "light" ? "#111827" : "#F9FAFB",
              },
            ]}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
            contentContainerStyle={styles.chipRowContent}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText
                    type="caption"
                    style={[
                      styles.chipText,
                      isSelected ? styles.chipSelectedText : undefined,
                    ]}
                  >
                    {category}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </ThemedView>

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.gridItem}>
              <ProductCard product={product} source="home" />
            </View>
          ))}

          {filteredProducts.length === 0 ? (
            <ThemedText type="bodySmall">
              Não encontramos itens para sua busca.
            </ThemedText>
          ) : null}
        </View>

        <ThemedView style={styles.tip}>
          <ThemedText type="defaultSemiBold">Dica</ThemedText>
          <ThemedText type="bodySmall">
            Use o botão abaixo para testar ações rápidas e visualizar opções
            contextuais.
          </ThemedText>

          <Link href="/modal">
            <Link.Trigger>
              <ThemedText type="link">Abrir menu de ações</ThemedText>
            </Link.Trigger>
          </Link>
        </ThemedView>
      </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 6,
    marginBottom: 10,
  },

  heroCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#E6F4FE",
    padding: 12,
    borderRadius: 16,
  },

  heroPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 18,
    backgroundColor: "rgba(14, 23, 32, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(14, 23, 32, 0.12)",
    padding: 12,
    justifyContent: "center",
    gap: 8,
  },

  heroLine: {
    height: 10,
    width: 62,
    borderRadius: 8,
    backgroundColor: "rgba(14, 23, 32, 0.14)",
  },

  cta: {
    marginTop: 6,
    backgroundColor: "#0a7ea4",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  searchSection: {
    gap: 10,
    marginTop: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  chipRow: {
    flexGrow: 0,
  },

  chipRowContent: {
    paddingRight: 6,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    marginRight: 8,
    minHeight: 34,
    maxWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },

  chipText: {
    textAlign: "center",
    lineHeight: 14,
  },

  chipSelected: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },

  chipSelectedText: {
    color: "#fff",
  },

  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },

  gridItem: {
    width: "50%",
    paddingHorizontal: 6,
    paddingBottom: 12,
  },

  tip: {
    gap: 6,
    marginTop: 8,
    paddingBottom: 8,
  },

  headerBanner: {
    width: "100%",
    height: "100%",
  },
});