import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppBanner from "../../components/AppBanner";
import AppHeader from "../../components/AppHeader";
import theme from "../../constants/theme";

function Item({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function AccountTabScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppBanner />

        <AppHeader
          title="Minha conta"
          subtitle="Acompanhe pedidos, notificações e canais de suporte da Plugaí Shop."
        />

        <View style={styles.list}>
          <Item
            title="Meus pedidos"
            subtitle="Acompanhe status, detalhes e rastreio."
            onPress={() => router.push("/orders" as any)}
          />

          <Item
            title="Notificações"
            subtitle="Pedidos, promoções e avisos do sistema."
            onPress={() => router.push("/account/notifications" as any)}
          />

          <Item
            title="Suporte"
            subtitle="Canais de atendimento e abertura de solicitações."
            onPress={() => router.push("/account/support" as any)}
          />

          <Item
            title="Endereços"
            subtitle="Gerencie seus endereços de entrega."
            onPress={() => router.push("/account/addresses" as any)}
          />
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
  cardTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
