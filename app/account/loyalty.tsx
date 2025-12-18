// app/account/loyalty.tsx
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

type LoyaltyTierId = "bronze" | "prata" | "ouro" | "diamante";

type LoyaltyTier = {
  id: LoyaltyTierId;
  name: string;
  minPoints: number;
  description: string;
  benefits: string[];
};

const TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minPoints: 0,
    description: "Ponto de partida da jornada Plugaí+.",
    benefits: ["Acesso a promoções gerais", "Notificações de ofertas relâmpago"],
  },
  {
    id: "prata",
    name: "Prata",
    minPoints: 300,
    description: "Cliente recorrente com vantagens especiais.",
    benefits: [
      "Descontos progressivos em campanhas selecionadas",
      "Prioridade em algumas ações promocionais",
    ],
  },
  {
    id: "ouro",
    name: "Ouro",
    minPoints: 800,
    description: "Nível avançado, com benefícios mais agressivos.",
    benefits: [
      "Descontos maiores em categorias estratégicas",
      "Acesso antecipado a grandes campanhas",
    ],
  },
  {
    id: "diamante",
    name: "Diamante",
    minPoints: 1500,
    description: "Top clientes Plugaí+.",
    benefits: [
      "Melhores condições comerciais",
      "Atendimentos e ações totalmente personalizados",
    ],
  },
];

// Valores simulados – depois podem vir do backoffice / API
const CURRENT_POINTS = 320;
const CURRENT_TIER_ID: LoyaltyTierId = "prata";

function getCurrentTier(): LoyaltyTier {
  return TIERS.find((t) => t.id === CURRENT_TIER_ID) ?? TIERS[0];
}

function getNextTier(): LoyaltyTier | undefined {
  const currentIndex = TIERS.findIndex((t) => t.id === CURRENT_TIER_ID);
  if (currentIndex === -1 || currentIndex === TIERS.length - 1) return undefined;
  return TIERS[currentIndex + 1];
}

function getProgressToNextTier(): number {
  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  if (!nextTier) return 1;

  const range = nextTier.minPoints - currentTier.minPoints;
  const progressed = Math.max(0, CURRENT_POINTS - currentTier.minPoints);
  const ratio = range > 0 ? progressed / range : 1;
  return Math.max(0, Math.min(1, ratio));
}

export default function LoyaltyScreen() {
  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progress = getProgressToNextTier();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="Plugaí+ Fidelidade"
          subtitle="Clube de vantagens da família Plugaí Shop."
        />

        {/* Nível atual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seu nível atual</Text>

          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentTierName}>{currentTier.name}</Text>
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Ativo</Text>
              </View>
            </View>

            <Text style={styles.currentDescription}>
              {currentTier.description}
            </Text>

            <View style={styles.pointsRow}>
              <View>
                <Text style={styles.pointsLabel}>Seus pontos</Text>
                <Text style={styles.pointsValue}>{CURRENT_POINTS}</Text>
              </View>
              {nextTier && (
                <View>
                  <Text style={styles.pointsLabel}>Próximo nível</Text>
                  <Text style={styles.pointsValue}>
                    {nextTier.name} · {nextTier.minPoints} pts
                  </Text>
                </View>
              )}
            </View>

            {nextTier && (
              <View style={styles.progressWrapper}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[styles.progressBarFill, { flex: progress }]}
                  />
                  <View
                    style={[
                      styles.progressBarRemaining,
                      { flex: 1 - progress },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  Faltam{" "}
                  {Math.max(0, nextTier.minPoints - CURRENT_POINTS)} pontos para
                  chegar ao nível {nextTier.name}.
                </Text>
              </View>
            )}

            {!nextTier && (
              <Text style={styles.progressLabel}>
                Você está no nível máximo do Plugaí+. Novos benefícios poderão
                ser liberados exclusivamente para esse grupo seleto.
              </Text>
            )}
          </View>
        </View>

        {/* Benefícios do nível atual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefícios do seu nível</Text>

          <View style={styles.benefitsCard}>
            {currentTier.benefits.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={styles.bullet} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
            <Text style={styles.benefitNote}>
              Benefícios reais serão conectados ao seu histórico de compras,
              cupons, campanhas e integrações futuras (Nuvemshop, marketplaces e
              muito mais).
            </Text>
          </View>
        </View>

        {/* Próximos níveis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos níveis</Text>

          <View style={styles.tierList}>
            {TIERS.map((tier) => (
              <View
                key={tier.id}
                style={[
                  styles.tierCard,
                  tier.id === currentTier.id && styles.tierCardActive,
                ]}
              >
                <View style={styles.tierHeaderRow}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierPoints}>
                    a partir de {tier.minPoints} pts
                  </Text>
                </View>
                <Text style={styles.tierDescription}>{tier.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Como ganhar mais pontos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como ganhar mais pontos</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Cada compra na Plugaí Shop gera pontos de acordo com o valor
              gasto e campanhas ativas.
            </Text>
            <Text style={styles.infoText}>
              • Futuramente, você poderá acumular pontos comprando no app, no
              site Plugaí e em marketplaces conectados.
            </Text>
            <Text style={styles.infoText}>
              • Ações especiais (como indicar amigos, participar de lives ou
              campanhas com influenciadores) também poderão render pontos
              extras.
            </Text>
          </View>
        </View>

        {/* CTAs finais */}
        <View style={styles.section}>
          <ButtonPrimary
            title="Explorar ofertas e ganhar pontos"
            onPress={() => router.push("/(tabs)/explore")}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={() => router.push("/account/coupons")}
          >
            <Text style={styles.linkButtonText}>
              Ver meus cupons disponíveis
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerInfo}>
            À medida que o ecossistema Plugaí crescer, este painel será
            conectado a dados reais de compras, campanhas e parceiros,
            transformando o Plugaí+ em um dos clubes de vantagens mais fortes do
            mercado.
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

  // Nível atual
  currentCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  currentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  currentTierName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  currentBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  currentDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  pointsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  pointsLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  pointsValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },

  progressWrapper: {
    marginTop: theme.spacing.xs,
  },
  progressBarBackground: {
    flexDirection: "row",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSoft,
    marginBottom: 4,
  },
  progressBarFill: {
    backgroundColor: theme.colors.primary,
  },
  progressBarRemaining: {
    backgroundColor: theme.colors.surface,
  },
  progressLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Benefícios
  benefitsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  benefitRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginRight: theme.spacing.sm,
  },
  benefitText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  benefitNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },

  // Lista de níveis
  tierList: {
    gap: theme.spacing.sm,
  },
  tierCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  tierCardActive: {
    borderColor: theme.colors.primarySoft,
    backgroundColor: theme.colors.surfaceAlt,
  },
  tierHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  tierName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  tierPoints: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  tierDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Como ganhar mais
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

  // Rodapé
  linkButton: {
    marginTop: theme.spacing.sm,
  },
  linkButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
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
