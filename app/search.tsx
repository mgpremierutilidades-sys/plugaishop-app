import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ProductCard } from "../components/product-card";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { categories, products } from "../constants/products";
import theme from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";
import { track } from "../lib/analytics";

export default function SearchScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("Todos");

  useEffect(() => {
    try {
      track("search_viewed");
    } catch {}
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    try {
      track("search_query_changed", { q_len: q.length });
    } catch {}
  }, [query]);

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
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: "Buscar",
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
        }}
      />

      <ThemedView style={styles.root}>
        <ThemedView style={styles.searchSection}>
          <TextInput
            placeholder="Buscar por categoria ou produto"
            placeholderTextColor={
              colorScheme === "light" ? "#6B7280" : "#9CA3AF"
            }
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
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

          <View style={styles.sectionHeader}>
            <ThemedText type="sectionTitle">Resultados</ThemedText>
            <ThemedText type="caption">
              {filteredProducts.length} itens
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.gridItem}>
              <ProductCard product={product} source="search" />
            </View>
          ))}

          {filteredProducts.length === 0 ? (
            <ThemedText type="bodySmall">
              Não encontramos itens para sua busca.
            </ThemedText>
          ) : null}
        </View>

        <Pressable onPress={() => router.back()} style={styles.backCta}>
          <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
            Voltar
          </ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 12,
  },

  searchSection: {
    gap: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 2,
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

  backCta: {
    marginTop: 8,
    alignSelf: "center",
    backgroundColor: "#0a7ea4",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
});