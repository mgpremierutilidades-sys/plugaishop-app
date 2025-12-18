// app/checkout/confirmation.tsx
import { router, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonPrimary from "../../components/ButtonPrimary";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type Params = {
  orderId?: string;
  total?: string;
};

export default function CheckoutConfirmationScreen() {
  const { orderId, total } = useLocalSearchParams<Params>();

  const displayOrderId = orderId || "PLG-" + new Date().getTime().toString().slice(-6);
  const displayTotal = total || formatCurrencyBRL(1899.9);

  const handleGoHome = () => {
    router.push("/(tabs)" as any);
  };

  const handleGoOrders = () => {
    router.push("/orders" as any);
  };

  const handleGoExplore = () => {
    router.push("/(tabs)/explore" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Cabeçalho + status */}
        <View style={styles.header}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>✓</Text>
          </View>

          <Text style={styles.title}>Pedido confirmado!</Text>
          <Text style={styles.subtitle}>
            Recebemos o seu pedido com sucesso. Em poucos instantes você
            receberá um e-mail com o resumo da compra e os próximos passos.
          </Text>
        </View>

        {/* Bloco resumo do pedido */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Número do pedido</Text>
            <Text style={styles.cardValueStrong}>{displayOrderId}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Total pago</Text>
            <Text style={styles.cardValuePrice}>{displayTotal}</Text>
          </View>

          <View style={[styles.rowBetween, { marginTop: theme.spacing.sm }]}>
            <Text style={styles.cardLabel}>Status</Text>
            <Text style={styles.cardChip}>Pagamento aprovado</Text>
          </View>
        </View>

        {/* Bloco de prazos e acompanhamento */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>E agora, o que acontece?</Text>

          <View style={styles.stepRow}>
            <View style={styles.stepBullet} />
            <View style={styles.stepTextWrapper}>
              <Text style={styles.stepTitle}>Separação do pedido</Text>
              <Text style={styles.stepSubtitle}>
                Vamos encaminhar seu pedido ao fornecedor e iniciar a separação
                dos produtos Plugaí Shop.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepBullet} />
            <View style={styles.stepTextWrapper}>
              <Text style={styles.stepTitle}>Envio e rastreio</Text>
              <Text style={styles.stepSubtitle}>
                Assim que o pedido for postado, você poderá acompanhar o
                rastreio completo pela área de <Text style={styles.inlineLink}>Meus pedidos</Text>.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepBullet} />
            <View style={styles.stepTextWrapper}>
              <Text style={styles.stepTitle}>Entrega segura</Text>
              <Text style={styles.stepSubtitle}>
                Fique tranquilo: qualquer dúvida ou problema, o suporte Plugaí
                Shop estará à disposição para te ajudar.
              </Text>
            </View>
          </View>
        </View>

        {/* Ações principais */}
        <View style={styles.actionsSection}>
          <ButtonPrimary
            title="Acompanhar pedido"
            onPress={handleGoOrders}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryButton}
            onPress={handleGoHome}
          >
            <Text style={styles.secondaryButtonText}>
              Voltar para a página inicial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.textButton}
            onPress={handleGoExplore}
          >
            <Text style={styles.textButtonText}>
              Continuar comprando na Plugaí Shop
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mensagem de confiança */}
        <View style={styles.trustSection}>
          <Text style={styles.trustTitle}>
            Plugaí Shop, o site de compras da família brasileira
          </Text>
          <Text style={styles.trustSubtitle}>
            Segurança, praticidade e ofertas inteligentes para o seu dia a dia,
            em qualquer lugar do Brasil.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ICON_SIZE = 56;

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

  header: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  statusIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  statusIconText: {
    fontSize: 30,
    color: theme.colors.primaryDark,
  },
  title: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  cardValueStrong: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  cardValuePrice: {
    ...theme.typography.priceMain,
    color: theme.colors.price,
  },
  cardChip: {
    ...theme.typography.badge,
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.sm,
  },

  sectionTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginBottom: theme.spacing.sm,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  stepBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginRight: theme.spacing.sm,
  },
  stepTextWrapper: {
    flex: 1,
  },
  stepTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  stepSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  inlineLink: {
    color: theme.colors.primary,
    fontWeight: "600",
  },

  actionsSection: {
    marginBottom: theme.spacing.lg,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
  },
  secondaryButtonText: {
    ...theme.typography.buttonLabel,
    color: theme.colors.primaryDark,
  },
  textButton: {
    marginTop: theme.spacing.xs,
    alignItems: "center",
  },
  textButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },

  trustSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  trustTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  trustSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
