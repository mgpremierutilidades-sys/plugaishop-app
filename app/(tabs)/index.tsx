import { router } from "expo-router";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ProductCard from "../../components/ProductCard";
import { PRODUCTS } from "../../constants/products";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

export default function HomeScreen() {
  const featured = PRODUCTS.slice(0, 6);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner reto (edge-to-edge) */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>

        <AppHeader
          title="Início"
          subtitle="Ofertas especiais, produtos selecionados e entrega rápida para todo o Brasil."
        />

        <View style={styles.quickRow}>
          <Pressable
            onPress={() => router.push("/(tabs)/explore" as any)}
            style={styles.quickButton}
          >
            <Text style={styles.quickButtonText}>Explorar</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/categories" as any)}
            style={[styles.quickButton, styles.quickButtonGhost]}
          >
            <Text style={[styles.quickButtonText, styles.quickButtonTextGhost]}>
              Categorias
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos em destaque</Text>

          <FlatList
            data={featured}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <ProductCard
                title={item.name}
                price={formatCurrencyBRL(item.price)}
                oldPrice={
                  item.oldPrice ? formatCurrencyBRL(item.oldPrice) : undefined
                }
                badge={item.badge}
                installmentText={item.installments}
                onPress={() => router.push(`/(tabs)/product/${item.id}` as any)}
                style={styles.gridCard}
              />
            )}
          />
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },

  bannerWrapper: {
    marginHorizontal: -theme.spacing.lg,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  banner: { width: "100%", height: 180 },

  quickRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  quickButton: {
    flex: 1,
    height: 44,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  quickButtonText: { ...theme.typography.buttonLabel },
  quickButtonGhost: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  quickButtonTextGhost: { color: theme.colors.primary },

  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },

  grid: { paddingTop: theme.spacing.sm, gap: theme.spacing.md },
  gridRow: { justifyContent: "space-between", marginBottom: theme.spacing.md },
  gridCard: { width: "48%" },
});
