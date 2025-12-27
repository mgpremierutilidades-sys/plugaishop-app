// app/(tabs)/checkout/success.tsx
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

export default function CheckoutSuccess() {
  const goOrders = () => {
    router.replace("/(tabs)" as any);
    router.push("/orders" as any);
  };

  const goHome = () => {
    router.replace("/(tabs)" as any);
    router.push("/(tabs)" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <ThemedText style={styles.icon}>✅</ThemedText>

          <ThemedText style={styles.title}>Pedido confirmado!</ThemedText>

          <ThemedText style={styles.text}>
            Seu pedido foi realizado com sucesso. Você pode acompanhar o status na área de pedidos.
          </ThemedText>

          <Pressable style={styles.primary} onPress={goOrders}>
            <ThemedText style={styles.primaryText}>VER MEUS PEDIDOS</ThemedText>
          </Pressable>

          <Pressable style={styles.secondary} onPress={goHome}>
            <ThemedText style={styles.secondaryText}>VOLTAR AO INÍCIO</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  center: {
    alignItems: "center",
  },

  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: FONT_TITLE,
    marginBottom: 8,
    textAlign: "center",
  },
  text: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    opacity: 0.85,
    textAlign: "center",
    marginBottom: 24,
  },

  primary: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FONT_BOLD,
  },

  secondary: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 12,
    fontFamily: FONT_BOLD,
  },
});
