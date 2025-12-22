// app/(tabs)/checkout/shipping.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

type ShippingOption = {
  id: "economico" | "normal" | "expresso";
  title: string;
  desc: string;
  price: string;
};

function Option({
  option,
  selected,
  onPress,
}: {
  option: ShippingOption;
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
        <View style={styles.optionTop}>
          <ThemedText style={styles.optionTitle}>{option.title}</ThemedText>
          <ThemedText style={styles.optionPrice}>{option.price}</ThemedText>
        </View>
        <ThemedText style={styles.optionDesc}>{option.desc}</ThemedText>
      </View>
      <ThemedText style={styles.optionMark}>{selected ? "✓" : ""}</ThemedText>
    </Pressable>
  );
}

export default function CheckoutShipping() {
  const goBack = () => router.back();
  const push = (path: string) => router.push(path as any);

  const options: ShippingOption[] = useMemo(
    () => [
      { id: "economico", title: "Econômico", desc: "Entrega estimada: 6–10 dias úteis", price: "R$ 19,90" },
      { id: "normal", title: "Normal", desc: "Entrega estimada: 3–6 dias úteis", price: "R$ 29,90" },
      { id: "expresso", title: "Expresso", desc: "Entrega estimada: 1–3 dias úteis", price: "R$ 49,90" },
    ],
    []
  );

  const [selectedId, setSelectedId] = useState<ShippingOption["id"]>("normal");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Frete</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Escolha a melhor opção</ThemedText>

          {options.map((opt) => (
            <Option
              key={opt.id}
              option={opt}
              selected={selectedId === opt.id}
              onPress={() => setSelectedId(opt.id)}
            />
          ))}

          <View style={styles.summary}>
            <ThemedText style={styles.summaryLabel}>Selecionado</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {options.find((o) => o.id === selectedId)?.title ?? "—"}
            </ThemedText>
          </View>

          <Pressable onPress={() => push("/(tabs)/checkout/payment")} style={styles.primaryBtn} accessibilityRole="button">
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
          </Pressable>

          <ThemedText style={styles.hint}>
            Integração futura: cálculo real por CEP via Nuvemshop/Bling (e regras de frete). Por ora, opções simuladas.
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
  optionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  optionTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD },
  optionPrice: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },
  optionDesc: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85, marginTop: 4 },
  optionMark: { width: 22, textAlign: "center", fontSize: 16, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },

  summary: {
    marginTop: 2,
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryLabel: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85 },
  summaryValue: { fontSize: 12, fontFamily: FONT_BODY_BOLD },

  primaryBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },

  hint: { marginTop: 12, fontSize: 12, fontFamily: FONT_BODY, opacity: 0.75 },
});
