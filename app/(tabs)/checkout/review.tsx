// app/(tabs)/checkout/review.tsx
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import { useCart } from "../../../context/CartContext";
import { formatCurrency } from "../../../utils/formatCurrency";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

const MOCK_FRETE = 29.9;

export default function CheckoutReview() {
  const { items, subtotal } = useCart();

  const total = subtotal + MOCK_FRETE;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Revisão do pedido</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        {/* ITENS */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Itens do carrinho</ThemedText>

          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <ThemedText style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </ThemedText>

              <ThemedText style={styles.itemQty}>x{item.qty}</ThemedText>

              <ThemedText style={styles.itemPrice}>
                {formatCurrency(item.price * item.qty)}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* RESUMO */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Resumo</ThemedText>

          <View style={styles.line}>
            <ThemedText style={styles.label}>Subtotal</ThemedText>
            <ThemedText style={styles.value}>
              {formatCurrency(subtotal)}
            </ThemedText>
          </View>

          <View style={styles.line}>
            <ThemedText style={styles.label}>Frete</ThemedText>
            <ThemedText style={styles.value}>
              {formatCurrency(MOCK_FRETE)}
            </ThemedText>
          </View>

          <View style={styles.totalBox}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>
              {formatCurrency(total)}
            </ThemedText>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.replace({ pathname: "/checkout/success" })
          }
        >
          <ThemedText style={styles.ctaText}>
            CONFIRMAR PEDIDO
          </ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 6 },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BOLD },
  rightSpacer: { width: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT_BOLD, marginBottom: 10 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  itemTitle: { flex: 1, fontSize: 12, fontFamily: FONT_BODY },
  itemQty: { width: 32, textAlign: "center", fontSize: 12 },
  itemPrice: { fontSize: 12, fontFamily: FONT_BOLD },

  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: { fontSize: 12, fontFamily: FONT_BODY },
  value: { fontSize: 12, fontFamily: FONT_BOLD },

  totalBox: {
    marginTop: 8,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 12, fontFamily: FONT_BOLD, color: "#000" },
  totalValue: { fontSize: 14, fontFamily: FONT_BOLD, color: "#000" },

  cta: {
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: FONT_BOLD },
});
