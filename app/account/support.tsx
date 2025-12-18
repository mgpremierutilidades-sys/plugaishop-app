import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppBanner from "../../components/AppBanner";
import AppHeader from "../../components/AppHeader";
import theme from "../../constants/theme";

export default function SupportScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppBanner />

        <AppHeader
          title="Suporte"
          subtitle="Em breve, o atendimento da Plugaí Shop estará integrado em múltiplos canais."
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chat dentro do app</Text>
          <Text style={styles.cardText}>
            Canal em desenvolvimento para atendimento em tempo real com IA + equipe Plugaí.
            Você poderá abrir chamados, anexar prints e acompanhar o histórico diretamente pelo app.
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Em breve</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>WhatsApp Plugaí Shop</Text>
          <Text style={styles.cardText}>
            Integração futura com número oficial da Plugaí Shop para receber notificações de pedidos,
            promoções e suporte rápido.
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Em breve</Text>
            </View>
          </View>
        </View>

        <View style={{ height: theme.spacing.xl }} />
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

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary, marginBottom: 6 },
  cardText: { ...theme.typography.caption, color: theme.colors.textSecondary },

  badgeRow: { marginTop: theme.spacing.md, flexDirection: "row" },
  badge: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...theme.typography.badge, color: theme.colors.primaryDark },
});
