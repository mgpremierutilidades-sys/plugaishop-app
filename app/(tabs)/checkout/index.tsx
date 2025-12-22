// app/(tabs)/checkout/index.tsx
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

export default function CheckoutIndex() {
  const goBack = () => router.back();
  const push = (path: string) => router.push(path as any);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Finalizar compra</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Resumo</ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.label}>Entrega</ThemedText>
            <ThemedText style={styles.value}>Endereço + Frete</ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.label}>Pagamento</ThemedText>
            <ThemedText style={styles.value}>Selecionar forma</ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.label}>Revisão</ThemedText>
            <ThemedText style={styles.value}>Conferir pedido</ThemedText>
          </View>

          <Pressable onPress={() => push("/(tabs)/checkout/address")} style={styles.primaryBtn} accessibilityRole="button">
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
          </Pressable>
        </View>

        <View style={styles.helpCard}>
          <ThemedText style={styles.helpTitle}>Precisa de ajuda?</ThemedText>
          <ThemedText style={styles.helpText}>
            Você poderá editar endereço, frete e pagamento nas próximas etapas.
          </ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 6, backgroundColor: theme.colors.background },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, marginBottom: 10 },

  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  label: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85 },
  value: { fontSize: 12, fontFamily: FONT_BODY_BOLD },

  primaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },

  helpCard: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  helpTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, marginBottom: 6 },
  helpText: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.9 },
});
