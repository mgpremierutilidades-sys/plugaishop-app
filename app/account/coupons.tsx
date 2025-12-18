// app/account/coupons.tsx
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
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type CouponStatus = "active" | "used" | "expired";
type CouponType = "percentage" | "fixed";

type Coupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minOrderValue?: number;
  expiresAt: string; // texto amigável para exibição
  status: CouponStatus;
};

const COUPONS: Coupon[] = [
  {
    id: "1",
    code: "PLG10",
    title: "10% OFF na sua próxima compra",
    description: "Válido para qualquer categoria, uma única utilização.",
    type: "percentage",
    value: 10,
    minOrderValue: 150,
    expiresAt: "31/12/2025",
    status: "active",
  },
  {
    id: "2",
    code: "PLGVIP20",
    title: "R$ 20,00 de desconto exclusivo",
    description: "Cupom especial para clientes Plugaí VIP.",
    type: "fixed",
    value: 20,
    minOrderValue: 200,
    expiresAt: "15/01/2026",
    status: "active",
  },
  {
    id: "3",
    code: "BEMVINDO5",
    title: "Cupom de boas-vindas",
    description: "5% OFF já utilizado em um pedido anterior.",
    type: "percentage",
    value: 5,
    minOrderValue: 0,
    expiresAt: "Usado em 05/12/2025",
    status: "used",
  },
  {
    id: "4",
    code: "CYBERWEEK",
    title: "Campanha Cyber Week encerrada",
    description: "Cupom promocional expirado.",
    type: "percentage",
    value: 15,
    minOrderValue: 0,
    expiresAt: "Expirado em 30/11/2025",
    status: "expired",
  },
];

function formatCouponValue(coupon: Coupon): string {
  if (coupon.type === "percentage") {
    return `${coupon.value}% OFF`;
  }
  return `${formatCurrencyBRL(coupon.value)} OFF`;
}

export default function CouponsScreen() {
  const activeCoupons = COUPONS.filter((c) => c.status === "active");
  const usedCoupons = COUPONS.filter((c) => c.status === "used");
  const expiredCoupons = COUPONS.filter((c) => c.status === "expired");

  const hasAnyCoupon = COUPONS.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="Cupons e benefícios"
          subtitle="Veja seus cupons disponíveis e planeje suas próximas compras."
        />

        {!hasAnyCoupon && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhum cupom disponível</Text>
            <Text style={styles.emptySubtitle}>
              Em breve, campanhas especiais e cupons personalizados aparecerão
              aqui para você.
            </Text>

            <View style={styles.actions}>
              <ButtonPrimary
                title="Explorar ofertas"
                onPress={() => router.push("/(tabs)/explore")}
              />
            </View>
          </View>
        )}

        {hasAnyCoupon && (
          <>
            {/* Resumo rápido */}
            <View style={styles.section}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resumo dos seus cupons</Text>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                      {activeCoupons.length}
                    </Text>
                    <Text style={styles.summaryLabel}>Ativos</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumberMuted}>
                      {usedCoupons.length}
                    </Text>
                    <Text style={styles.summaryLabel}>Utilizados</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumberMuted}>
                      {expiredCoupons.length}
                    </Text>
                    <Text style={styles.summaryLabel}>Expirados</Text>
                  </View>
                </View>

                <Text style={styles.summaryInfo}>
                  Em versões futuras, esta área será conectada às campanhas
                  reais da Plugaí Shop, com cupons personalizados por perfil,
                  comportamento de compra e canais (app, site, marketplaces).
                </Text>
              </View>
            </View>

            {/* Cupons ativos */}
            {activeCoupons.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cupons ativos</Text>
                <Text style={styles.sectionSubtitle}>
                  Aplique estes cupons no checkout para aproveitar seus
                  benefícios.
                </Text>

                {activeCoupons.map((coupon) => (
                  <View key={coupon.id} style={styles.couponCardActive}>
                    <View style={styles.couponHeader}>
                      <Text style={styles.couponCode}>{coupon.code}</Text>
                      <Text style={styles.couponValue}>
                        {formatCouponValue(coupon)}
                      </Text>
                    </View>

                    <Text style={styles.couponTitle}>{coupon.title}</Text>
                    <Text style={styles.couponDescription}>
                      {coupon.description}
                    </Text>

                    <View style={styles.couponMetaRow}>
                      <Text style={styles.couponMeta}>
                        Válido até: {coupon.expiresAt}
                      </Text>
                      {coupon.minOrderValue && coupon.minOrderValue > 0 && (
                        <Text style={styles.couponMeta}>
                          Pedido mínimo:{" "}
                          {formatCurrencyBRL(coupon.minOrderValue)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.couponActions}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.applyButton}
                        onPress={() => router.push("/checkout")}
                      >
                        <Text style={styles.applyButtonText}>
                          Usar no checkout
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Cupons usados */}
            {usedCoupons.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cupons utilizados</Text>

                {usedCoupons.map((coupon) => (
                  <View key={coupon.id} style={styles.couponCardMuted}>
                    <View style={styles.couponHeader}>
                      <Text style={styles.couponCodeMuted}>{coupon.code}</Text>
                      <Text style={styles.couponValueMuted}>
                        {formatCouponValue(coupon)}
                      </Text>
                    </View>

                    <Text style={styles.couponTitleMuted}>
                      {coupon.title}
                    </Text>
                    <Text style={styles.couponDescriptionMuted}>
                      {coupon.description}
                    </Text>

                    <Text style={styles.couponMetaMuted}>
                      {coupon.expiresAt}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cupons expirados */}
            {expiredCoupons.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cupons expirados</Text>

                {expiredCoupons.map((coupon) => (
                  <View key={coupon.id} style={styles.couponCardMuted}>
                    <View style={styles.couponHeader}>
                      <Text style={styles.couponCodeMuted}>{coupon.code}</Text>
                      <Text style={styles.couponValueMuted}>
                        {formatCouponValue(coupon)}
                      </Text>
                    </View>

                    <Text style={styles.couponTitleMuted}>
                      {coupon.title}
                    </Text>
                    <Text style={styles.couponDescriptionMuted}>
                      {coupon.description}
                    </Text>

                    <Text style={styles.couponMetaMuted}>
                      {coupon.expiresAt}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.bottomSpacer} />
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
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Estado vazio
  emptyState: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...theme.typography.bodyStrong,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  actions: {
    width: "100%",
    marginTop: theme.spacing.lg,
  },

  // Card de resumo
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  summaryTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  summaryNumberMuted: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  summaryInfo: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  // Cards de cupons
  couponCardActive: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
    marginTop: theme.spacing.sm,
  },
  couponCardMuted: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginTop: theme.spacing.sm,
    opacity: 0.85,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  couponCode: {
    ...theme.typography.bodyStrong,
    color: theme.colors.primaryDark,
  },
  couponValue: {
    ...theme.typography.badge,
    color: theme.colors.price, // corrigido: antes estava theme.colors.priceStrong
  },
  couponCodeMuted: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textSecondary,
  },
  couponValueMuted: {
    ...theme.typography.badge,
    color: theme.colors.textSecondary,
  },

  couponTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  couponTitleMuted: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  couponDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  couponDescriptionMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },

  couponMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  couponMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  couponMetaMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },

  couponActions: {
    marginTop: theme.spacing.sm,
  },
  applyButton: {
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  applyButtonText: {
    ...theme.typography.buttonLabel,
    color: "#FFFFFF",
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
