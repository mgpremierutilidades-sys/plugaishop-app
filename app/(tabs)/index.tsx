import { Image } from "expo-image";
import { Link, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ProductCard } from "../../components/product-card";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";
import { trackHomeFail, trackHomeProductClick, trackHomeView } from "../../utils/homeAnalytics";

const ALL = "Todos" as const;

export default function HomeScreen() {
  // tenta enviar fila quando abrir o app
  useOutboxAutoFlush();

  // anti-duplicação (React Strict Mode / foco rápido)
  const lastViewTsRef = useRef(0);
  const lastClickByProductRef = useRef<Record<string, number>>({});

  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastViewTsRef.current < 800) return;
      lastViewTsRef.current = now;

      void trackHomeView().catch(() => {
        // no-op: tracking não pode quebrar a UX
      });
    }, [])
  );

  const onSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const onOpenProduct = useCallback((productId: string, position?: number) => {
    // dedupe de toque rápido
    const now = Date.now();
    const last = lastClickByProductRef.current[productId] ?? 0;
    if (now - last < 500) return;
    lastClickByProductRef.current[productId] = now;

    void trackHomeProductClick({ productId, position }).catch(() => {
      // no-op
    });

    try {
      router.push(`/product/${productId}` as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void trackHomeFail({ scope: "home_action", message: msg.slice(0, 120) }).catch(() => {
        // no-op
      });
    }
  }, []);

  const categories = useMemo(() => {
    try {
      const set = new Set<string>();
      for (const p of products as Product[]) {
        if (p?.category) set.add(String(p.category));
      }
      return [ALL, ...Array.from(set)];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void trackHomeFail({ scope: "home_render", message: msg.slice(0, 120) }).catch(() => {
        // no-op
      });
      return [ALL];
    }
  }, []);

  const filteredProducts = useMemo(() => {
    try {
      const normalizedQuery = query.trim().toLowerCase();

      return (products as Product[]).filter((product) => {
        const matchesCategory = selectedCategory === ALL || product.category === selectedCategory;

        const title = String(product.title ?? "").toLowerCase();
        const desc = String(product.description ?? "").toLowerCase();

        const matchesQuery =
          normalizedQuery.length === 0 ||
          title.includes(normalizedQuery) ||
          desc.includes(normalizedQuery);

        return matchesCategory && matchesQuery;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void trackHomeFail({ scope: "home_render", message: msg.slice(0, 120) }).catch(() => {
        // no-op
      });
      return [] as Product[];
    }
  }, [query, selectedCategory]);

  return (
    <>
      {/* iPhone: horas/bateria brancas sobre o banner */}
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
          <ThemedText type="title">Economize Mais</ThemedText>
          <ThemedText type="defaultSemiBold">
            Soluções curadas para acelerar a operação e o varejo inteligente.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.heroCard}>
          <View style={{ flex: 1, gap: 8 }}>
            <ThemedText type="subtitle">Kit rápido de vitrine</ThemedText>
            <ThemedText>
              Combine iluminação, organização e sinalização para deixar seu ponto de venda pronto em
              minutos.
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={styles.cta}>
                <ThemedText type="defaultSemiBold">Ver recomendações</ThemedText>
              </Pressable>
            </Link>
          </View>

          <Image
            source={require("../../assets/banners/banner-splash.png")}
            style={styles.heroImage}
            contentFit="cover"
          />
        </ThemedView>

        <ThemedView style={styles.searchSection}>
          <ThemedText type="subtitle">Catálogo Plugaishop</ThemedText>

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
            autoCapitalize="none"
            autoCorrect={false}
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

        <View style={styles.grid}>
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => onOpenProduct(String(product.id), idx)}
            />
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
  titleContainer: {
    gap: 8,
    marginBottom: 12,
  },

  heroCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#E6F4FE",
    padding: 16,
    borderRadius: 16,
  },

  heroImage: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: "#0E1720",
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
});
