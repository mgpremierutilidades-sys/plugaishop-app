import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppBanner from "../../components/AppBanner";
import AppHeader from "../../components/AppHeader";
import theme from "../../constants/theme";

type NotificationType = "order" | "promo" | "system";

const MOCK: Array<{ id: string; type: NotificationType; title: string; body: string }> = [
  {
    id: "n1",
    type: "order",
    title: "Pedido em processamento",
    body: "Seu pedido #PLG-2025-0001 está sendo preparado para envio.",
  },
  {
    id: "n2",
    type: "promo",
    title: "Oferta relâmpago",
    body: "Descontos especiais por tempo limitado em eletrônicos e casa.",
  },
  {
    id: "n3",
    type: "system",
    title: "Atualização do app",
    body: "Melhorias de performance e padronização de layout (versão 2026).",
  },
];

function badgeLabel(type: NotificationType) {
  if (type === "order") return "Pedido";
  if (type === "promo") return "Promo";
  return "Sistema";
}

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppBanner />

        <AppHeader
          title="Notificações"
          subtitle="Fique por dentro de pedidos, promoções e atualizações da Plugaí Shop."
        />

        <View style={styles.list}>
          {MOCK.map((n) => (
            <View key={n.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title}>{n.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeLabel(n.type)}</Text>
                </View>
              </View>
              <Text style={styles.body}>{n.body}</Text>
            </View>
          ))}
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

  list: { rowGap: theme.spacing.md },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    columnGap: theme.spacing.sm,
    marginBottom: 6,
  },
  title: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary, flex: 1 },
  body: { ...theme.typography.caption, color: theme.colors.textSecondary },

  badge: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...theme.typography.badge, color: theme.colors.primaryDark },
});
