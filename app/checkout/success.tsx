// app/checkout/success.tsx
import { router } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ButtonPrimary from "../../components/ButtonPrimary";
import { PRODUCTS, type Product } from "../../constants/products";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type CartItem = {
  product: Product;
  quantity: number;
};

const MOCK_CART_ITEMS: CartItem[] = [
  { product: PRODUCTS[0], quantity: 1 },
  { product: PRODUCTS[1], quantity: 2 },
];

const SHIPPING_COST = 29.9;
const DISCOUNT_VALUE = 20.0;

export default function CheckoutSuccessScreen() {
  const subtotal = MOCK_CART_ITEMS.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = subtotal + SHIPPING_COST - DISCOUNT_VALUE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner padronizado */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>

        <AppHeader
          title="Pedido confirmado!"
          subtitle="Recebemos o seu pedido e em breve ele começará a ser preparado para envio."
        />

        {/* Ilustração de sucesso */}
        <View style={styles.heroWrapper}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.heroTitle}>
            Obrigado por comprar na Plugaí Shop!
          </Text>
          <Text style={styles.heroSubtitle}>
            Você receberá atualizações do seu pedido por e-mail e poderá
            acompanhar os detalhes em “Meus pedidos”.
          </Text>
        </View>

        {/* Resumo rápido do pedido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do pedido</Text>
          <View style={styles.card}>
            <Text style={styles.labelMuted}>Itens</Text>
            {MOCK_CART_ITEMS.map((item) => (
              <View key={item.product.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <View style={styles.itemRight}>
                  <Text style={styles.itemQty}>
                    x{item.quantity}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrencyBRL(
                      item.product.price * item.quantity
                    )}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.cardDivider} />

            <View style={styles.rowBetween}>
              <Text style={styles.labelMuted}>Subtotal</Text>
              <Text style={styles.valueDefault}>
                {formatCurrencyBRL(subtotal)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.labelMuted}>Frete</Text>
              <Text style={styles.valueDefault}>
                {formatCurrencyBRL(SHIPPING_COST)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.labelMuted}>Descontos</Text>
              <Text style={styles.valueDiscount}>
                - {formatCurrencyBRL(DISCOUNT_VALUE)}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.rowBetween}>
              <Text style={styles.totalLabel}>Total pago</Text>
              <Text style={styles.totalValue}>
                {formatCurrencyBRL(total)}
              </Text>
            </View>

            <Text style={styles.totalHint}>
              Este é um exemplo ilustrativo. Em produção, os dados virão do
              pedido real integrado com seu backend / Nuvemshop.
            </Text>
          </View>
        </View>

        {/* Ações após o pedido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos passos</Text>
          <View style={styles.card}>
            <Text style={styles.nextStepText}>
              • Acompanhe o status em tempo real em{" "}
              <Text style={styles.nextStepStrong}>Meus pedidos</Text>.
            </Text>
            <Text style={styles.nextStepText}>
              • Fique atento ao e-mail cadastrado para notificações de envio.
            </Text>
            <Text style={styles.nextStepText}>
              • Em breve você poderá compartilhar o pedido ou gerar nota fiscal
              diretamente pelo app.
            </Text>
          </View>
        </View>

        {/* Botões finais */}
        <View style={styles.section}>
          <View style={styles.actions}>
            <ButtonPrimary
              title="Ver meus pedidos"
              onPress={() => router.push("/orders")}
            />
            <View style={styles.spacer} />
            <ButtonPrimary
              title="Voltar à loja"
              onPress={() => router.push("/(tabs)")}
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  banner: {
    width: "100%",
    height: 180,
  },

  heroWrapper: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.backgroundSoft,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  successCheck: {
    fontSize: 44,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  heroTitle: {
    ...theme.typography.bodyStrong,
    fontSize: 20,
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.sm,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    columnGap: theme.spacing.sm,
  },

  labelMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  valueDefault: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  valueDiscount: {
    ...theme.typography.bodyStrong,
    color: theme.colors.danger,
  },

  // itens
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    columnGap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  itemName: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemQty: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  itemPrice: {
    ...theme.typography.bodyStrong,
    color: theme.colors.price,
  },

  totalLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    ...theme.typography.priceMain,
    fontSize: 22,
  },
  totalHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },

  nextStepText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  nextStepStrong: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  actions: {
    width: "100%",
  },
  spacer: {
    height: theme.spacing.sm,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
