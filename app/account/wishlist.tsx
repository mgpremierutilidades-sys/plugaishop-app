// app/account/wishlist.tsx
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ProductCard from "../../components/ProductCard";
import { PRODUCTS, type Product } from "../../constants/products";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

// Mock de lista de desejos — depois ligamos com backend/estado real
const MOCK_WISHLIST: Product[] = PRODUCTS.slice(3, 9);

export default function WishlistScreen() {
  const wishlist = MOCK_WISHLIST;

  const handleOpenProduct = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleGoExplore = () => {
    router.push("/(tabs)/explore");
  };

  const hasItems = wishlist.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Lista de desejos"
        subtitle="Salve aqui produtos que você quer acompanhar ou comprar depois."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasItems ? (
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyTitle}>Sua lista está vazia</Text>
            <Text style={styles.emptySubtitle}>
              Encontre ofertas incríveis na Plugaí Shop e toque em “Salvar” nos
              produtos para adicioná-los à sua lista de desejos.
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.ctaButton}
              onPress={handleGoExplore}
            >
              <Text style={styles.ctaLabel}>Ir para ofertas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Itens na sua lista ({wishlist.length})
            </Text>

            <View style={styles.grid}>
              {wishlist.map((product) => (
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
                  // CORREÇÃO: usamos a propriedade "installments" do Product
                  installmentText={product.installments}
                  onPress={() => handleOpenProduct(product)}
                  style={styles.card}
                />
              ))}
            </View>

            <View style={styles.footerHint}>
              <Text style={styles.footerHintText}>
                Em breve, sua lista de desejos será sincronizada com seu login
                Plugaí Shop em todos os dispositivos.
              </Text>
            </View>
          </>
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

  sectionTitle: {
    ...theme.typography.sectionTitle,
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  card: {
    width: "48%",
  },

  emptyWrapper: {
    paddingTop: 32,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  emptyTitle: {
    ...theme.typography.sectionTitle,
    textAlign: "center",
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.body,
    textAlign: "center",
    color: "#6B7280",
  },
  ctaButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  ctaLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  footerHint: {
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
  },
  footerHintText: {
    ...theme.typography.caption,
    color: "#4B5563",
    textAlign: "center",
  },
});

export { };

