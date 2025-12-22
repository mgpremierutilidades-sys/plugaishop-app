import { router } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import theme from "../../constants/theme";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { formatCurrency } from "../../utils/formatCurrency";

// Carrega Collapsible de forma blindada (default vs named vs módulo quebrado)
const CollapsibleModule = require("../../components/ui/collapsible");
const CollapsibleComp = CollapsibleModule?.default ?? CollapsibleModule?.Collapsible;

const SafeCollapsible =
  CollapsibleComp ??
  function FallbackCollapsible(props: any) {
    return (
      <View>
        {props?.title ? <View style={{ marginBottom: 8 }}>{props.title}</View> : null}
        <View>{props?.children}</View>
      </View>
    );
  };

type CategoryItem = { id: string; name: string };

function toCategoryId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ExploreScreen() {
  const mainCategories = useMemo<CategoryItem[]>(() => {
    const map = new Map<string, CategoryItem>();

    for (const p of products as Product[]) {
      const raw = (p.category ?? "").trim();
      if (!raw) continue;

      const id = toCategoryId(raw);
      if (map.has(id)) continue;

      map.set(id, { id, name: raw });
      if (map.size >= 8) break;
    }

    if (map.size === 0) {
      const fallback = [
        "Eletrônicos",
        "Eletrodomésticos",
        "Informática",
        "Casa e Lar",
        "Moda",
        "Brinquedos",
        "Pet",
        "Beleza",
      ];

      for (const name of fallback) {
        const id = toCategoryId(name);
        map.set(id, { id, name });
      }
    }

    return Array.from(map.values());
  }, []);

  const featured = useMemo<Product[]>(() => (products as Product[]).slice(0, 12), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar</Text>

        <Pressable style={styles.headerAction} onPress={() => {}}>
          <Text style={styles.headerActionText}>Buscar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorias principais</Text>

          <View style={styles.grid}>
            {mainCategories.map((c) => {
              const oneWord = c.name.trim().split(/\s+/).length === 1;

              return (
                <Pressable
                  key={c.id}
                  style={styles.categoryCard}
                  onPress={() => router.push((`/category/${c.id}` as unknown) as any)}
                >
                  <View style={styles.categoryIconFallback} />

                  <Text
                    style={styles.categoryName}
                    numberOfLines={oneWord ? 1 : 2}
                    adjustsFontSizeToFit={oneWord}
                    minimumFontScale={oneWord ? 0.82 : 1}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SafeCollapsible
            title={
              <View style={styles.collapseTitle}>
                <Text style={styles.collapseTitleText}>Dicas e novidades</Text>
              </View>
            }
            initiallyExpanded={false}
          >
            <Text style={styles.helperText}>Promoções, avisos e conteúdo leve podem ficar aqui.</Text>
          </SafeCollapsible>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos em destaque</Text>

          <View style={styles.productsGrid}>
            {featured.map((p) => (
              <Pressable
                key={p.id}
                style={styles.productCard}
                onPress={() => router.push((`/product/${p.id}` as unknown) as any)}
              >
                <Image source={{ uri: p.image }} style={styles.productImage} />
                <Text style={styles.productTitle} numberOfLines={2}>
                  {p.title}
                </Text>
                <Text style={styles.productPrice}>{formatCurrency(p.price)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, color: theme.colors.text },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  headerActionText: { fontSize: 12, color: theme.colors.text },

  content: { padding: 16, paddingBottom: 28 },

  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 16, marginBottom: 10, color: theme.colors.text },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  categoryCard: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  categoryIconFallback: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 8,
    alignSelf: "center",
  },
  categoryName: { fontSize: 12, color: theme.colors.text, textAlign: "center" },

  collapseTitle: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  collapseTitleText: { fontSize: 14, color: theme.colors.text },
  helperText: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },

  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  productCard: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.surfaceAlt,
  },
  productTitle: { fontSize: 12, color: theme.colors.text, marginBottom: 6 },
  productPrice: { fontSize: 12, color: theme.colors.primary },
});
