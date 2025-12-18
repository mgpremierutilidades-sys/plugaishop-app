import { router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ButtonPrimary from "../../components/ButtonPrimary";
import IconSymbol from "../../components/ui/icon-symbol";
import { PRODUCTS, type Product } from "../../constants/products";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type CartItem = { product: Product; quantity: number };

const MOCK_CART_ITEMS: CartItem[] = [
  { product: PRODUCTS[0], quantity: 1 },
  { product: PRODUCTS[1], quantity: 2 },
];

const SHIPPING_ESTIMATE = 29.9;

export default function CartScreen() {
  const hasItems = MOCK_CART_ITEMS.length > 0;

  const handleBack = () => {
    try {
      router.back();
    } catch {
      router.replace("/(tabs)/index" as any);
    }
  };

  const subtotal = MOCK_CART_ITEMS.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = subtotal + SHIPPING_ESTIMATE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner reto (edge-to-edge) + VOLTAR acima do banner */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.banner}
            resizeMode="cover"
          />

          <Pressable onPress={handleBack} style={styles.backOverlay} hitSlop={12}>
            <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <AppHeader
          title="Carrinho"
          subtitle="Revise os itens que você escolheu antes de avançar para o checkout."
        />

        {hasItems ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Itens no carrinho ({MOCK_CART_ITEMS.length})
              </Text>

              <View style={styles.card}>
                {MOCK_CART_ITEMS.map((item, idx) => (
                  <View key={item.product.id}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="clip">
                          {item.product.name}
                        </Text>
                        <Text style={styles.itemQty}>Quantidade: {item.quantity}</Text>
                      </View>

                      <View style={styles.itemPrices}>
                        <Text style={styles.itemPrice}>
                          {formatCurrencyBRL(item.product.price * item.quantity)}
                        </Text>

                        {!!item.product.oldPrice && (
                          <Text style={styles.itemOldPrice}>
                            {formatCurrencyBRL(item.product.oldPrice * item.quantity)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {idx < MOCK_CART_ITEMS.length - 1 ? <View style={styles.itemDivider} /> : null}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumo do carrinho</Text>

              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.labelMuted}>Subtotal</Text>
                  <Text style={styles.valueDefault}>{formatCurrencyBRL(subtotal)}</Text>
                </View>

                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <Text style={styles.labelMuted}>Frete estimado</Text>
                  <Text style={styles.valueDefault}>{formatCurrencyBRL(SHIPPING_ESTIMATE)}</Text>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.rowBetween}>
                  <Text style={styles.totalLabel}>Total estimado</Text>
                  <Text style={styles.totalValue}>{formatCurrencyBRL(total)}</Text>
                </View>

                <Text style={styles.totalHint}>
                  O valor final pode mudar conforme endereço, frete e descontos aplicados no checkout.
                </Text>

                <View style={styles.actions}>
                  <ButtonPrimary title="Ir para checkout" onPress={() => router.push("/(tabs)/checkout" as any)} />

                  <Text style={styles.secondaryHint}>
                    Em breve, o carrinho será totalmente integrado com a Nuvemshop e seu estoque real.
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
            <Text style={styles.emptySubtitle}>
              Explore as ofertas da Plugaí Shop e adicione itens para montar seu carrinho.
            </Text>

            <ButtonPrimary title="Explorar produtos" onPress={() => router.push("/(tabs)/explore" as any)} />
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    position: "relative",
  },
  banner: { width: "100%", height: 180 },

  // VOLTAR acima do banner (não fica atrás)
  backOverlay: {
    position: "absolute",
    top: -8,
    left: 12,
    zIndex: 999,
    elevation: 12,
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary,
  },

  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadows.card,
  },
  cardDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.md },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", columnGap: theme.spacing.sm },

  itemRow: { flexDirection: "row", justifyContent: "space-between", columnGap: theme.spacing.sm, paddingVertical: 10 },
  itemDivider: { height: 1, backgroundColor: theme.colors.divider },
  itemInfo: { flex: 1, paddingRight: 8 },
  itemName: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
  itemQty: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  itemPrices: { alignItems: "flex-end" },
  itemPrice: { ...theme.typography.bodyStrong, color: theme.colors.price },
  itemOldPrice: { ...theme.typography.caption, color: theme.colors.textMuted, textDecorationLine: "line-through", marginTop: 2 },

  labelMuted: { ...theme.typography.caption, color: theme.colors.textSecondary },
  valueDefault: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
  totalLabel: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
  totalValue: { ...theme.typography.priceMain, fontSize: 22 },
  totalHint: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.sm, lineHeight: 18 },

  actions: { marginTop: theme.spacing.md },
  secondaryHint: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, lineHeight: 18 },

  emptyState: { marginTop: theme.spacing.xl, alignItems: "center", paddingHorizontal: theme.spacing.lg, rowGap: theme.spacing.md },
  emptyTitle: { ...theme.typography.sectionTitle, color: theme.colors.textPrimary, textAlign: "center" },
  emptySubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 18 },

  bottomSpacer: { height: theme.spacing.xl },
});
