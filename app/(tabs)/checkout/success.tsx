// app/(tabs)/checkout/success.tsx
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";

export default function CheckoutSuccess() {
  function goOrders() {
    // ✅ rota absoluta
    router.push("/orders");
  }

  function goHome() {
    // ✅ volta pro group das abas (home)
    router.replace("/(tabs)");
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Pedido confirmado
        </ThemedText>

        <ThemedText style={styles.text}>
          Recebemos seu pedido. Você pode acompanhar o status na área de pedidos.
        </ThemedText>

        <Pressable onPress={goOrders} style={styles.primary}>
          <ThemedText type="defaultSemiBold" style={styles.primaryText}>
            Ver pedidos
          </ThemedText>
        </Pressable>

        <Pressable onPress={goHome} style={styles.secondary}>
          <ThemedText type="defaultSemiBold">Voltar ao início</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: theme.colors.background },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  title: { color: theme.colors.text },
  text: { color: theme.colors.textMuted },

  primary: {
    marginTop: 6,
    backgroundColor: theme.colors.success,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#000" },

  secondary: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
});
