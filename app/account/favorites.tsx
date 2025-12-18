// app/account/favorites.tsx
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

// Mock inicial: depois vamos ligar isso a um contexto/API de favoritos
const MOCK_FAVORITES: Product[] = PRODUCTS.slice(0, 6);

export default function FavoritesScreen() {
  const favorites = MOCK_FAVORITES;

  const handleOpenProduct = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleGoExplore = () => {
    router.push("/(tabs)/explore");
  };

  const hasFavorites = favorites.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Favoritos"
        subtitle="Produtos que você salvou para ver ou comprar depois."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasFavorites ? (
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
            <Text style={styles.emptySubtitle}>
              Toque no coração dos produtos para salvá-los aqui e acompanhar
              preços e disponibilidade.
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.ctaButton}
              onPress={handleGoExplore}
            >
              <Text style={styles.ctaLabel}>Começar a explorar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Seus produtos favoritos ({favorites.length})
            </Text>

            <View style={styles.grid}>
              {favorites.map((product) => (
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
                Em breve, seus favoritos serão sincronizados com sua conta
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
