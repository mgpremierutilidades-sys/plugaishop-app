// app/category/[slug].tsx
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ProductCard from "../../components/ProductCard";

import { CATEGORIES, type Category } from "../../constants/categories";
import { PRODUCTS, type Product } from "../../constants/products";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  // Encontra a categoria pela slug
  const category: Category | undefined = useMemo(
    () => CATEGORIES.find((cat: Category) => cat.slug === slug),
    [slug]
  );

  // Filtra produtos dessa categoria
  const productsInCategory: Product[] = useMemo(
    () =>
      PRODUCTS.filter(
        (product: Product) => product.category === slug
      ),
    [slug]
  );

  // Texto da contagem
  const productsCountLabel =
    productsInCategory.length === 0
      ? "Nenhum produto nesta categoria (por enquanto)."
      : productsInCategory.length === 1
      ? "1 produto encontrado."
      : `${productsInCategory.length} produtos encontrados.`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={category?.name ?? "Categoria"}
        subtitle={
          category?.description ??
          "Veja os produtos selecionados da categoria na Plugaí Shop."
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>
            Produtos da categoria
          </Text>
          <Text style={styles.countText}>{productsCountLabel}</Text>
        </View>

        {productsInCategory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Em breve produtos aqui
            </Text>
            <Text style={styles.emptySubtitle}>
              Estamos preparando ofertas especiais para esta categoria.
              Volte em alguns dias para conferir as novidades.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {productsInCategory.map((product: Product) => (
              <ProductCard
                key={product.id}
                title={product.name}
                price={formatCurrencyBRL(product.price)}
                oldPrice={
                  product.oldPrice
                    ? formatCurrencyBRL(product.oldPrice)
                    : undefined
                }
                badge={product.badge}
                installmentText={product.installments}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  headerRow: {
    marginBottom: 12,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,
    marginBottom: 4,
  },

  countText: {
    ...theme.typography.caption,
    color: theme.colors.icon,
  },

  grid: {
    gap: 12,
  },

  emptyState: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
  },
  emptyTitle: {
    ...theme.typography.bodyStrong,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.icon,
  },
});
