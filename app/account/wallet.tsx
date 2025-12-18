// app/account/wallet.tsx
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
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

const MOCK_BALANCE = 250.0;
const MOCK_PENDING_CASHBACK = 37.5;
const MOCK_COUPONS = 3;

export default function WalletScreen() {
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
          title="Carteira Plugaí"
          subtitle="Acompanhe seus créditos, cashback e benefícios exclusivos da Plugaí Shop."
        />

        {/* Resumo financeiro principal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo financeiro</Text>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo disponível</Text>
            <Text style={styles.balanceValue}>
              {formatCurrencyBRL(MOCK_BALANCE)}
            </Text>
            <Text style={styles.balanceHint}>
              Este saldo poderá ser usado em compras futuras, aplicado
              automaticamente no checkout, conforme as regras de uso.
            </Text>

            <View style={styles.balanceRow}>
              <View style={styles.balanceRowItem}>
                <Text style={styles.balanceRowLabel}>
                  Cashback pendente
                </Text>
                <Text style={styles.balanceRowValue}>
                  {formatCurrencyBRL(MOCK_PENDING_CASHBACK)}
                </Text>
              </View>
              <View style={styles.balanceRowItem}>
                <Text style={styles.balanceRowLabel}>
                  Cupons ativos
                </Text>
                <Text style={styles.balanceRowValue}>
                  {MOCK_COUPONS} cupons
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cupons e benefícios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Cupons e benefícios
          </Text>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>
              Cupons promocionais
            </Text>
            <Text style={styles.benefitText}>
              Em versões futuras, seus cupons de desconto (como
              PLG10, FRETEGRATIS, VIPFAMÍLIA) aparecerão aqui, com
              validade, regras de uso e botão para aplicar no
              carrinho.
            </Text>
            <Text style={styles.benefitTag}>
              Exemplo: cupom PLG10 – 10% OFF na primeira compra.
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>
              Programa Plugaí+ Família
            </Text>
            <Text style={styles.benefitText}>
              A ideia é criar um programa de benefícios com níveis
              (Bronze, Prata, Ouro) baseado em valor gasto anual,
              liberando frete reduzido, cashback maior e ofertas
              exclusivas.
            </Text>
            <Text style={styles.benefitTag}>
              Em breve: acompanhamento de nível e vantagens direto na
              carteira.
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>
              Créditos de estorno
            </Text>
            <Text style={styles.benefitText}>
              Reembolsos de pedidos cancelados ou devolvidos podem ser
              convertidos em créditos na Carteira Plugaí, acelerando
              novas compras sem depender de processamento bancário.
            </Text>
            <Text style={styles.benefitTag}>
              Transparência total: histórico de créditos e débitos em
              um só lugar.
            </Text>
          </View>
        </View>

        {/* Histórico (placeholder) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Histórico de movimentações
          </Text>
          <Text style={styles.sectionSubtitle}>
            Nesta primeira versão, o histórico é apenas ilustrativo.
            Em integração futura com o backend, cada entrada mostrará
            data, tipo de movimento (crédito/débito), origem e saldo
            após a operação.
          </Text>

          <View style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={styles.historyTextWrapper}>
                <Text style={styles.historyTitle}>
                  Crédito por devolução de pedido
                </Text>
                <Text style={styles.historySubtitle}>
                  Pedido #12345 · Exemplo ilustrativo
                </Text>
              </View>
              <Text style={styles.historyAmountPositive}>
                + {formatCurrencyBRL(149.9)}
              </Text>
            </View>

            <View style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={styles.historyTextWrapper}>
                <Text style={styles.historyTitle}>
                  Uso de créditos no checkout
                </Text>
                <Text style={styles.historySubtitle}>
                  Compra realizada na Plugaí Shop
                </Text>
              </View>
              <Text style={styles.historyAmountNegative}>
                - {formatCurrencyBRL(80)}
              </Text>
            </View>

            <View style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={styles.historyTextWrapper}>
                <Text style={styles.historyTitle}>
                  Bônus de boas-vindas
                </Text>
                <Text style={styles.historySubtitle}>
                  Campanha promocional para novos clientes
                </Text>
              </View>
              <Text style={styles.historyAmountPositive}>
                + {formatCurrencyBRL(50)}
              </Text>
            </View>
          </View>

          <ButtonPrimary
            title="Ver histórico completo (em breve)"
            onPress={() => {
              console.log(
                "Futuro: abrir tela de histórico completo da carteira"
              );
            }}
          />

          <Text style={styles.footerText}>
            A Carteira Plugaí vai se tornar o hub financeiro do
            cliente dentro do app: créditos, cashback, cupons, níveis
            de fidelidade e muito mais, tudo amarrado à experiência
            de compra.
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
  bannerWrapper: {
    marginHorizontal: -theme.spacing.lg,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  banner: {
    width: "100%",
    height: 180,
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

  // Card principal de saldo
  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  balanceLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  balanceValue: {
    ...theme.typography.priceMain,
    fontSize: 28,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  balanceHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: theme.spacing.sm,
  },
  balanceRowItem: {
    flex: 1,
  },
  balanceRowLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  balanceRowValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },

  // Benefícios
  benefitCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  benefitTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  benefitText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  benefitTag: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  // Histórico
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.md,
    rowGap: theme.spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: theme.spacing.sm,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  historyTextWrapper: {
    flex: 1,
  },
  historyTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  historySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  historyAmountPositive: {
    ...theme.typography.bodyStrong,
    color: theme.colors.price,
  },
  historyAmountNegative: {
    ...theme.typography.bodyStrong,
    color: theme.colors.danger,
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
