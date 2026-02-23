import { Image } from "expo-image";
import { Link } from "expo-router";
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
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { categories, products } from "../../constants/products";
import { isFlagEnabled } from "../../constants/flags";
import { HomeAchadinhosEvents, track } from "../../lib/analytics";
import { getAchadinhosOfDay } from "../../data/catalog";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

export default function HomeScreen() {
  useCheckoutFailSafe();
  useOutboxAutoFlush();

  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>("Todos");

  const [achadinhosSeen, setAchadinhosSeen] = useState(false);
  const [achadinhosScrolled, setAchadinhosScrolled] = useState(false);

  const achadinhos = useMemo(() => getAchadinhosOfDay(10), []);
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

  return (
    <>
      <StatusBar style="light" />

      {/* ✅ Banner do topo: intocado */}
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
        {/* ✅ REMOVIDO: texto de marca duplicada abaixo do banner */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Boas-vindas</ThemedText>
          <ThemedText type="bodySmall">
            Soluções curadas para acelerar a operação e o varejo inteligente.
          </ThemedText>
        </ThemedView>

        {/* ✅ Hero mais compacto e SEM usar banner-splash (evita “imagem no meio”) */}
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

          {/* ✅ Placeholder neutro: não duplica branding e não vira “quadrado preto” */}
          <View style={styles.heroPlaceholder}>
            <View style={styles.heroLine} />
            <View style={[styles.heroLine, { width: 54 }]} />
            <View style={[styles.heroLine, { width: 42 }]} />
          </View>
        </ThemedView>

        
        {/* [AUTOPILOT_HOME_ACHADINHOS] shelf com flag + métricas */}
        {isFlagEnabled("ff_home_achadinhos_shelf") && achadinhos.length > 0 ? (
          <ThemedView
            style={styles.achadinhosSection}
            onLayout={() => {
              if (!achadinhosSeen) {
                setAchadinhosSeen(true);
                track(HomeAchadinhosEvents.impression, { count: achadinhos.length });
              }
            }}
          >
            <View style={styles.sectionHeader}>
              <ThemedText type="sectionTitle">Achadinhos do Dia</ThemedText>
              <ThemedText type="caption">ofertas com desconto</ThemedText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achadinhosScroll}
              scrollEventThrottle={64}
              onScroll={() => {
                if (!achadinhosScrolled) {
                  setAchadinhosScrolled(true);
                  track(HomeAchadinhosEvents.shelfScroll, { count: achadinhos.length });
                }
              }}
            >
              {achadinhos.map((p) => (
                <View key={p.id} style={styles.achadinhosItem}>
                  <ProductCard
                    product={p}
                    variant="shelf"
                    onPress={() => track(HomeAchadinhosEvents.cardClick, { id: p.id })}
                  />
                </View>
              ))}
            </ScrollView>
          </ThemedView>
        ) : null}

        {/* ✅ Seção de busca + chips compactos */}
        <ThemedView style={styles.searchSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="sectionTitle">Catálogo</ThemedText>
            <ThemedText type="caption">
              {filteredProducts.length} itens
            </ThemedText>
          </View>

          <TextInput
            placeholder="Buscar por categoria ou produto"
            placeholderTextColor={
              colorScheme === "light" ? "#6B7280" : "#9CA3AF"
            }
            value={query}
            onChangeText={setQuery}
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
                  {/* ✅ Sem numberOfLines => sem reticências */}
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

        {/* ✅ Grid 2 colunas (mais produtos por tela) */}
        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.gridItem}>
              <ProductCard product={product} />
            </View>
          ))}

          {filteredProducts.length === 0 ? (
            <ThemedText type="bodySmall">
              Não encontramos itens para sua busca.
            </ThemedText>
          ) : null}
        </View>

        {/* ✅ Dica compacta (mantém a funcionalidade, menos espaço) */}
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

    // ✅ evita “…”: deixa o chip crescer em altura se precisar quebrar linha
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

  achadinhosSection: { marginTop: 12 },
  achadinhosScroll: { paddingLeft: 16, paddingRight: 4 },
  achadinhosItem: { marginRight: 12 },
});


