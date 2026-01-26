// app/(tabs)/checkout/success.tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import { clearOrderDraft } from "../../../utils/orderStorage";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

export default function Success() {
  useEffect(() => {
    // evita duplicação de pedidos
    clearOrderDraft();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Pedido confirmado</ThemedText>

        <ThemedText style={styles.subtitle}>
          Obrigado pela sua compra. Seu pedido foi registrado com sucesso.
        </ThemedText>

        <View style={{ height: 20 }} />

        <Pressable onPress={() => router.replace("/" as any)} style={styles.btn}>
          <ThemedText style={styles.btnText}>Voltar para a loja</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: { fontFamily: FONT_TITLE, fontSize: 22, fontWeight: "800" },
  subtitle: { textAlign: "center" },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  btnText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: "#FFF" },
});
