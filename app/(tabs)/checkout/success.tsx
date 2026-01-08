// app/(tabs)/checkout/success.tsx
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";

export default function CheckoutSuccess() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Pedido confirmado!</ThemedText>
        <ThemedText style={styles.subtitle}>
          Recebemos seu pedido e jÃ¡ estamos preparando tudo.
        </ThemedText>

        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => router.push("/orders")}>
            <ThemedText style={styles.primaryText}>Ver meus pedidos</ThemedText>
          </Pressable>

          <Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)")}>
            <ThemedText style={styles.secondaryText}>Voltar para a Home</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
  title: {
    fontFamily: "Arimo",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "OpenSans",
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 18,
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  primary: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    fontFamily: "OpenSans",
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.background,
  },
  secondary: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  secondaryText: {
    fontFamily: "OpenSans",
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
});

