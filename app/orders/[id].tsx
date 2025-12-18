import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ButtonPrimary from "../../components/ButtonPrimary";
import IconSymbol from "../../components/ui/icon-symbol";
import { ORDERS, type Order } from "../../constants/orders";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type ExtendedOrder = Order & {
  shippingCost?: number;
  discount?: number;
  paymentMethod?: string;
  shippingMethod?: string;
  trackingCode?: string;
};

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
    case "PENDING":
      return "Pagamento pendente";
    case "processing":
    case "PROCESSING":
      return "Em processamento";
    case "shipped":
    case "SHIPPED":
      return "Enviado";
    case "delivered":
    case "DELIVERED":
      return "Entregue";
    case "cancelled":
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Status desconhecido";
  }
}

function getStatusDescription(status: string): string {
  switch (status) {
    case "pending":
    case "PENDING":
      return "Estamos aguardando a confirmação do pagamento.";
    case "processing":
    case "PROCESSING":
      return "Seu pedido está sendo preparado para envio.";
    case "shipped":
    case "SHIPPED":
      return "O pedido já saiu para transporte e está a caminho.";
    case "delivered":
    case "DELIVERED":
      return "Entrega confirmada. Esperamos que você aproveite a compra!";
    case "cancelled":
    case "CANCELLED":
      return "O pedido foi cancelado. Confira o motivo em seu e-mail ou fale com o suporte.";
    default:
      return "Para mais detalhes, entre em contato com nosso suporte.";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
    case "PENDING":
      return theme.colors.warning;
    case "processing":
    case "PROCESSING":
      return theme.colors.primary;
    case "shipped":
    case "SHIPPED":
      return theme.colors.primaryDark;
    case "delivered":
    case "DELIVERED":
      return theme.colors.success;
    case "cancelled":
    case "CANCELLED":
      return theme.colors.danger;
    default:
      return theme.colors.textSecondary;
  }
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const rawOrder: Order | undefined = id
    ? ORDERS.find((o) => o.id === id)
    : undefined;

  const handleBack = () => {
    // back seguro
    try {
      router.back();
    } catch {
      router.replace("/orders" as any);
    }
  };

  if (!rawOrder) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.bannerWrapper}>
              <Image
                source={require("../../assets/banners/banner-home.png")}
                style={styles.banner}
                resizeMode="cover"
              />

              {/* VOLTAR ÚNICO (sobre o banner) */}
              <Pressable
                onPress={handleBack}
                style={styles.backOverlay}
                hitSlop={12}
              >
                <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            <AppHeader
              title="Pedido não encontrado"
              subtitle="Verifique o código do pedido ou retorne à lista de pedidos."
            />

            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Não encontramos esse pedido</Text>
              <Text style={styles.emptySubtitle}>
                Tente voltar à tela de “Meus pedidos” e selecionar o pedido
                novamente. Se o problema persistir, fale com o suporte da Plugaí
                Shop.
              </Text>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  const order = rawOrder as ExtendedOrder;

  const statusLabel = getStatusLabel(String(order.status));
  const statusColor = getStatusColor(String(order.status));
  const statusDescription = getStatusDescription(String(order.status));

  const totalFormatted = formatCurrencyBRL(order.total);

  const itemsTotal = order.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemsTotalFormatted = formatCurrencyBRL(itemsTotal);

  const shippingCost = order.shippingCost ?? 0;
  const discount = order.discount ?? 0;
  const shippingCostFormatted = formatCurrencyBRL(shippingCost);
  const hasDiscount = discount > 0;
  const discountFormatted = hasDiscount ? formatCurrencyBRL(discount) : "";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.bannerWrapper}>
            <Image
              source={require("../../assets/banners/banner-home.png")}
              style={styles.banner}
              resizeMode="cover"
            />

            {/* VOLTAR ÚNICO (sobre o banner) */}
            <Pressable
              onPress={handleBack}
              style={styles.backOverlay}
              hitSlop={12}
            >
              <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <AppHeader
            title={`Pedido ${order.code}`}
            subtitle="Veja o resumo completo da sua compra, status e detalhes de entrega."
          />

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Status do pedido</Text>

            <View style={styles.statusRow}>
              <View style={[styles.statusPill, { borderColor: statusColor }]}>
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>

              <Text style={styles.statusDate}>Realizado em {order.createdAt}</Text>
            </View>

            <Text style={styles.statusDescription}>{statusDescription}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo do pedido</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Itens ({order.items.length})
                </Text>
                <Text style={styles.summaryValue}>{itemsTotalFormatted}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frete</Text>
                <Text style={styles.summaryValue}>{shippingCostFormatted}</Text>
              </View>

              {hasDiscount && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Descontos</Text>
                  <Text style={styles.summaryValueDiscount}>
                    - {discountFormatted}
                  </Text>
                </View>
              )}

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total do pedido</Text>
                <Text style={styles.summaryTotalValue}>{totalFormatted}</Text>
              </View>

              {order.paymentMethod && (
                <Text style={styles.summaryHint}>
                  Forma de pagamento: {order.paymentMethod}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itens do pedido</Text>

            <View style={styles.itemsList}>
              {order.items.map((item) => {
                const lineTotal = item.product.price * item.quantity;
                return (
                  <View key={item.product.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product.name}</Text>
                      <Text style={styles.itemMeta}>
                        Quantidade: {item.quantity}
                      </Text>
                      <Text style={styles.itemMeta}>
                        Preço unitário: {formatCurrencyBRL(item.product.price)}
                      </Text>
                    </View>

                    <View style={styles.itemPriceWrapper}>
                      <Text style={styles.itemTotal}>
                        {formatCurrencyBRL(lineTotal)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entrega e rastreamento</Text>

            <View style={styles.shippingCard}>
              <Text style={styles.shippingLabel}>Método de envio</Text>
              <Text style={styles.shippingValue}>
                {order.shippingMethod ?? "A definir"}
              </Text>

              {order.trackingCode ? (
                <>
                  <Text style={styles.shippingLabel}>Código de rastreio</Text>
                  <Text style={styles.shippingValue}>{order.trackingCode}</Text>
                  <Text style={styles.shippingHint}>
                    Use esse código no site ou app da transportadora para
                    acompanhar a entrega em tempo real.
                  </Text>
                </>
              ) : (
                <Text style={styles.shippingHint}>
                  Assim que o pedido for despachado, exibiremos o código de
                  rastreio aqui.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <ButtonPrimary
              title="Comprar novamente (em breve)"
              onPress={() => {
                console.log("Futuro: recriar carrinho com os itens deste pedido");
              }}
            />

            <Text style={styles.footerText}>
              Em versões futuras do app Plugaí Shop, você poderá abrir
              reclamações, solicitar troca ou devolução e avaliar produtos
              diretamente nesta tela.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </>
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
    position: "relative",
  },
  banner: {
    width: "100%",
    height: 180,
  },

  // VOLTAR ÚNICO (sobre o banner)
  backOverlay: {
    position: "absolute",
    top: -6, // sobe um pouco acima, como você pediu
    left: 12,
    zIndex: 20,
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },

  emptyState: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
    rowGap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.lg,
  },
  statusTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    columnGap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusLabel: {
    ...theme.typography.caption,
    fontWeight: "700",
  },
  statusDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  statusDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  summaryValueDiscount: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.sm,
  },
  summaryTotalLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  summaryTotalValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.price,
  },
  summaryHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  itemsList: {
    rowGap: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  itemInfo: {
    flex: 1,
    paddingRight: theme.spacing.sm,
    rowGap: 2,
  },
  itemName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  itemPriceWrapper: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  itemTotal: {
    ...theme.typography.bodyStrong,
    color: theme.colors.price,
  },

  shippingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    rowGap: 4,
  },
  shippingLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  shippingValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  shippingHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
