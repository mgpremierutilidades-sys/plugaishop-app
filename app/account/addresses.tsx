import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppBanner from "../../components/AppBanner";
import AppHeader from "../../components/AppHeader";
import theme from "../../constants/theme";

export default function AddressesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppBanner />

        <AppHeader
          title="Endereços"
          subtitle="Em breve você poderá cadastrar, editar e selecionar múltiplos endereços."
        />

        <View style={styles.card}>
          <Text style={styles.title}>Endereço principal</Text>
          <Text style={styles.line}>Rua P-30, nº 250, Qd. P-99 Lt. 07, 2º Andar</Text>
          <Text style={styles.line}>Setor dos Funcionários · Goiânia/GO · 74543-440</Text>
          <Text style={styles.hint}>
            Esta tela é um placeholder seguro para evitar travamentos enquanto integramos cadastro real.
          </Text>
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
  },
  title: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary, marginBottom: 6 },
  line: { ...theme.typography.caption, color: theme.colors.textSecondary },
  hint: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
