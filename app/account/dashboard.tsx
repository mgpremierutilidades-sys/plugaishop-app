// app/account/dashboard.tsx
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
import ButtonPrimary from "../../components/ButtonPrimary";
import { ORDERS, type Order } from "../../constants/orders";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

function getStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Pago";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    case "canceled":
    case "cancelled":
      return "Cancelado";
    default:
      return "Em andamento";
  }
}

function getLastOrder(orders: Order[]): Order | undefined {
  if (!orders.length) return undefined;
  // Supondo que o array já venha do mais recente para o mais antigo
  return orders[0];
}

export default function DashboardScreen() {
  const totalOrders = ORDERS.length;

  const totalSpent = ORDERS.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  const lastOrder = getLastOrder(ORDERS);

  // Valores simulados (serão reais quando integrarmos com backoffice / fidelidade)
  const loyaltyPoints = 320;
  const activeCoupons = 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="Resumo da conta"
          subtitle="Uma visão geral da sua jornada na Plugaí Shop."
        />

        {/* Métricas principais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seus destaques hoje</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pedidos</Text>
              <Text style={styles.metricValue}>{totalOrders}</Text>
              <Text style={styles.metricHint}>no histórico</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total gasto</Text>
              <Text style={styles.metricValue}>
                {formatCurrencyBRL(totalSpent)}
              </Text>
              <Text style={styles.metricHint}>em compras Plugaí</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pontos fidelidade</Text>
              <Text style={styles.metricValue}>{loyaltyPoints}</Text>
              <Text style={styles.metricHint}>visão futura Plugaí+</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Cupons ativos</Text>
              <Text style={styles.metricValue}>{activeCoupons}</Text>
              <Text style={styles.metricHint}>disponíveis na conta</Text>
            </View>
          </View>
        </View>

        {/* Último pedido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Último pedido</Text>

          {!lastOrder && (
            <Text style={styles.emptyText}>
              Assim que você realizar sua primeira compra, o resumo aparecerá
              aqui com status, total e rastreio.
            </Text>
          )}

          {lastOrder && (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderCode}>
                    Pedido #{lastOrder.code || lastOrder.id}
                  </Text>
                  {lastOrder.createdAt && (
                    <Text style={styles.orderDate}>
                      {new Date(lastOrder.createdAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </Text>
                  )}
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {getStatusLabel(String(lastOrder.status))}
                  </Text>
                </View>
              </View>

              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Total</Text>
                <Text style={styles.orderValue}>
                  {formatCurrencyBRL(lastOrder.total || 0)}
                </Text>
              </View>

              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Itens</Text>
                <Text style={styles.orderValue}>
                  {lastOrder.items?.length || 0}
                </Text>
              </View>

              <View style={styles.orderActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.linkButton}
                  onPress={() => router.push("/orders")}
                >
                  <Text style={styles.linkButtonText}>
                    Ver todos os pedidos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.linkButton}
                  onPress={() =>
                    router.push(`/orders/${encodeURIComponent(lastOrder.id)}`)
                  }
                >
                  <Text style={styles.linkButtonText}>
                    Detalhes do pedido
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Atividade e visão futura */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sua jornada na Plugaí</Text>

          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={styles.bullet} />
              <View style={styles.timelineTextWrapper}>
                <Text style={styles.timelineTitle}>
                  Conta criada com sucesso
                </Text>
                <Text style={styles.timelineSubtitle}>
                  A base da sua jornada no ecossistema Plugaí Shop, conectando
                  app, site e marketplaces.
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.bullet} />
              <View style={styles.timelineTextWrapper}>
                <Text style={styles.timelineTitle}>
                  App Plugaí — versão 2026
                </Text>
                <Text style={styles.timelineSubtitle}>
                  Esta versão inicial é o núcleo de algo muito maior: em breve,
                  integraremos ERPs, hubs logísticos, influencers e clubes de
                  vantagens.
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.bullet} />
              <View style={styles.timelineTextWrapper}>
                <Text style={styles.timelineTitle}>
                  Futuro: Plugaí como super app
                </Text>
                <Text style={styles.timelineSubtitle}>
                  Painéis financeiros, cashback, assinatura de clubes, acesso
                  a parceiros e muito mais — tudo a partir da sua conta Plugaí.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA final */}
        <View style={styles.section}>
          <ButtonPrimary
            title="Explorar ofertas agora"
            onPress={() => router.push("/(tabs)/explore")}
          />
          <Text style={styles.footerInfo}>
            Use a aba Explorar para navegar por categorias, ver destaques e, em
            breve, receber recomendações personalizadas com base no seu
            comportamento dentro do app e do site Plugaí Shop.
          </Text>
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

  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },

  // Métricas principais
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  metricHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },

  // Pedido
  orderCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  orderCode: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  orderDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  statusBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  orderLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  orderValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  orderActionsRow: {
    flexDirection: "row",
    marginTop: theme.spacing.sm,
  },
  linkButton: {
    marginRight: theme.spacing.md,
  },
  linkButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },

  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Timeline / jornada
  timelineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: theme.spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginRight: theme.spacing.sm,
  },
  timelineTextWrapper: {
    flex: 1,
  },
  timelineTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  timelineSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  footerInfo: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
