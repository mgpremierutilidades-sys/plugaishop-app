// app/orders/index.tsx
import { Stack, router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import IconSymbol from "../../components/ui/icon-symbol";
import { ORDERS, type Order, type OrderStatus } from "../../constants/orders";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

function formatOrderDate(dateISO: string): string {
  const date = new Date(dateISO);
  const datePart = date.toLocaleDateString("pt-BR");
  const timePart = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "processing":
      return "Em processamento";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function getStatusColors(status: OrderStatus) {
  switch (status) {
    case "processing":
      return { bg: theme.colors.primarySoft, text: theme.colors.primaryDark };
    case "shipped":
      return { bg: theme.colors.backgroundSoft, text: theme.colors.textPrimary };
    case "delivered":
      return { bg: "#DCFCE7", text: "#15803D" }; // verde sucesso
    case "cancelled":
      return { bg: "#FEE2E2", text: "#B91C1C" }; // vermelho
    default:
      return { bg: theme.colors.backgroundSoft, text: theme.colors.textPrimary };
  }
}

export default function OrdersScreen() {
  function handleOpenOrder(order: Order) {
    router.push(`/orders/${order.id}` as never);
  }

  const handleBack = () => {
    // back seguro
    try {
      router.back();
    } catch {
      router.replace("/" as any);
    }
  };

  return (
    <>
      {/* Remove QUALQUER header/back automático do Expo Router nesta tela */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        {/* VOLTAR ÚNICO (overlay) — esta tela não tem banner, então fica acima do conteúdo sem bagunçar layout */}
        <Pressable onPress={handleBack} style={styles.backOverlay} hitSlop={12}>
          <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>

        <ScrollView contentContainerStyle={styles.container}>
          <AppHeader
            title="Meus pedidos"
            subtitle="Acompanhe o status e o histórico das suas compras."
          />

          {ORDERS.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Você ainda não fez pedidos</Text>
              <Text style={styles.emptySubtitle}>
                Assim que você realizar suas compras, seu histórico aparecerá
                aqui.
              </Text>
            </View>
          ) : (
            <View style={styles.listWrapper}>
              {ORDERS.map((order) => {
                const colors = getStatusColors(order.status);
                const itemsCount = order.items.reduce(
                  (acc, item) => acc + item.quantity,
                  0
                );

                return (
                  <TouchableOpacity
                    key={order.id}
                    activeOpacity={0.85}
                    style={styles.orderCard}
                    onPress={() => handleOpenOrder(order)}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.orderCode}>{order.code}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: colors.bg },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: colors.text }]}>
                          {getStatusLabel(order.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.orderDate}>
                      {formatOrderDate(order.createdAt)}
                    </Text>

                    <View style={styles.rowBetweenMiddle}>
                      <Text style={styles.orderItems}>
                        {itemsCount} item
                        {itemsCount !== 1 ? "s" : ""}
                      </Text>
                      <Text style={styles.orderTotal}>
                        {formatCurrencyBRL(order.total)}
                      </Text>
                    </View>

                    <Text style={styles.orderHint}>
                      Toque para ver detalhes, itens e atualizações do envio.
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

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

  // VOLTAR ÚNICO (overlay)
  backOverlay: {
    position: "absolute",
    top: 10, // fica acima do conteúdo sem alterar o layout
    left: 12,
    zIndex: 30,
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary,
  },

  listWrapper: {
    marginTop: theme.spacing.md,
    rowGap: theme.spacing.md,
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  rowBetweenMiddle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: theme.spacing.sm,
  },
  orderCode: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: "700",
  },
  orderDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  orderItems: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  orderTotal: {
    ...theme.typography.priceMain,
    color: theme.colors.price,
  },
  orderHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  emptyState: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
