import { Image } from "expo-image";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ProductCard } from "@/components/product-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { categories, products } from "@/constants/products";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ✅ NOVO: fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

export default function HomeScreen() {
  // ✅ NOVO: retoma checkout se existir draft pendente
  useCheckoutFailSafe();

  // ✅ NOVO: tenta enviar fila (Bling/Nuvemshop) quando abrir o app
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

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#E6F4FE", dark: "#0E1720" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">PlugaíShop</ThemedText>
        <ThemedText type="defaultSemiBold">
          Soluções curadas para acelerar a operação e o varejo inteligente.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.heroCard}>
        <View style={{ flex: 1, gap: 8 }}>
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
        <Image
          source={require("@/assets/images/react-logo.png")}
          style={styles.heroImage}
          contentFit="contain"
        />
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
    width: 120,
    height: 120,
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
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
