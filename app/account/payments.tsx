// app/account/payments.tsx
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

type PaymentMethodType = "card" | "pix" | "boleto";

type PaymentMethod = {
  id: string;
  type: PaymentMethodType;
  label: string;
  masked?: string;
  isDefault?: boolean;
  description?: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "1",
    type: "card",
    label: "Cartão Visa final 1234",
    masked: "•••• •••• •••• 1234",
    isDefault: true,
    description: "Cartão principal para compras no app Plugaí Shop.",
  },
  {
    id: "2",
    type: "pix",
    label: "Chave Pix CPF",
    description:
      "Futuramente, a Plugaí Shop integrará Pix com aprovação instantânea.",
  },
];

function getMethodTypeLabel(type: PaymentMethodType): string {
  switch (type) {
    case "card":
      return "Cartão de crédito";
    case "pix":
      return "Pix";
    case "boleto":
      return "Boleto";
    default:
      return "Pagamento";
  }
}

export default function PaymentsScreen() {
  const hasMethods = PAYMENT_METHODS.length > 0;
  const defaultMethod = PAYMENT_METHODS.find((m) => m.isDefault);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="Formas de pagamento"
          subtitle="Configure como você prefere pagar suas compras na Plugaí Shop."
        />

        {/* Método padrão em destaque */}
        {defaultMethod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forma de pagamento padrão</Text>

            <View style={styles.defaultCard}>
              <View style={styles.defaultHeader}>
                <Text style={styles.defaultLabel}>{defaultMethod.label}</Text>
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Padrão</Text>
                </View>
              </View>

              <Text style={styles.methodType}>
                {getMethodTypeLabel(defaultMethod.type)}
              </Text>

              {defaultMethod.masked && (
                <Text style={styles.masked}>{defaultMethod.masked}</Text>
              )}

              {defaultMethod.description && (
                <Text style={styles.description}>
                  {defaultMethod.description}
                </Text>
              )}

              <View style={styles.defaultActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.secondaryButton}
                  onPress={() => {
                    // Futuro: editar método padrão
                    console.log("Editar método padrão");
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Outros métodos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outras formas de pagamento</Text>

          {!hasMethods && (
            <Text style={styles.emptyText}>
              Você ainda não cadastrou nenhuma forma de pagamento. Em breve,
              será possível salvar cartões, chaves Pix e preferências de
              pagamento diretamente aqui.
            </Text>
          )}

          {PAYMENT_METHODS.filter((m) => !m.isDefault).map((method) => (
            <View key={method.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>{method.label}</Text>
                <Text style={styles.cardTag}>
                  {getMethodTypeLabel(method.type)}
                </Text>
              </View>

              {method.masked && (
                <Text style={styles.masked}>{method.masked}</Text>
              )}

              {method.description && (
                <Text style={styles.description}>{method.description}</Text>
              )}

              <View style={styles.cardActionsRow}>
                {!method.isDefault && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.linkButton}
                    onPress={() => {
                      // Futuro: tornar padrão
                      console.log("Definir como padrão", method.id);
                    }}
                  >
                    <Text style={styles.linkButtonText}>
                      Definir como padrão
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.linkButton}
                  onPress={() => {
                    // Futuro: editar / remover
                    console.log("Editar forma de pagamento", method.id);
                  }}
                >
                  <Text style={styles.linkButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Bloco: visão futura */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visão futura Plugaí</Text>
          <Text style={styles.sectionSubtitle}>
            Esta área será o hub financeiro do cliente dentro do app.
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Integração com gateways de pagamento (cartão, Pix, boleto,
              carteiras digitais).
            </Text>
            <Text style={styles.infoText}>
              • Preferências por canal (app, site, marketplaces conectados).
            </Text>
            <Text style={styles.infoText}>
              • Regras inteligentes de parcelamento, cashback e clube de
              vantagens.
            </Text>
          </View>
        </View>

        {/* CTA final */}
        <View style={styles.section}>
          <ButtonPrimary
            title="Finalizar compra"
            onPress={() => router.push("/checkout")}
          />
          <Text style={styles.footerInfo}>
            Em versões futuras, a forma de pagamento padrão será aplicada
            automaticamente nos seus pedidos, com opção de trocar em um toque
            no checkout.
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
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  // Card padrão
  defaultCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  defaultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  defaultLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  defaultBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  methodType: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  masked: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  description: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  defaultActions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  secondaryButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },

  // Cards adicionais
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  cardLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  cardTag: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  cardActionsRow: {
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

  // Visão futura
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
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
