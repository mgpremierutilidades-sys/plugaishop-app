// app/(tabs)/checkout/payment.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { isFlagEnabled } from "../../../constants/flags";
import theme from "../../../constants/theme";
import { track } from "../../../lib/analytics";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

type PaymentMethod = "pix" | "card" | "boleto";

function Option({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null]}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={styles.optionDesc}>{desc}</ThemedText>
      </View>
      <ThemedText style={styles.optionMark}>{selected ? "✓" : ""}</ThemedText>
    </Pressable>
  );
}

export default function CheckoutPayment() {
  const goBack = () => router.back();

  const paymentEnabled = isFlagEnabled("ff_checkout_payment_v1");
  const analyticsEnabled = isFlagEnabled("ff_cart_analytics_v1");

  useEffect(() => {
    if (!paymentEnabled) {
      router.replace("/checkout/review" as any);
      return;
    }
    if (analyticsEnabled) track("checkout_payment_view");
  }, [paymentEnabled, analyticsEnabled]);

  const [method, setMethod] = useState<PaymentMethod>("pix");

  const canContinue = useMemo(() => !!method, [method]);

  const select = (m: PaymentMethod) => {
    setMethod(m);
    if (analyticsEnabled) track("checkout_payment_select", { method: m });
  };

  const goNext = () => {
    if (!canContinue) {
      if (analyticsEnabled) {
        track("checkout_error", { step: "payment", reason: "validation" });
      }
      return;
    }
    router.push("/checkout/review" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Pagamento</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Escolha uma forma</ThemedText>

          <Option
            title="Pix"
            desc="Aprovação imediata"
            selected={method === "pix"}
            onPress={() => select("pix")}
          />
          <Option
            title="Cartão de crédito"
            desc="Parcelamento disponível"
            selected={method === "card"}
            onPress={() => select("card")}
          />
          <Option
            title="Boleto"
            desc="Compensação em até 2 dias úteis"
            selected={method === "boleto"}
            onPress={() => select("boleto")}
          />

          <Pressable
            onPress={goNext}
            style={[styles.primaryBtn, !canContinue ? { opacity: 0.6 } : null]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
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
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: theme.colors.background,
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
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

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  optionSelected: { borderColor: theme.colors.primary },
  optionTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD },
  optionDesc: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    opacity: 0.85,
    marginTop: 4,
  },
  optionMark: {
    width: 22,
    textAlign: "center",
    fontSize: 16,
    fontFamily: FONT_BODY_BOLD,
    color: theme.colors.primary,
  },

  primaryBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },
});