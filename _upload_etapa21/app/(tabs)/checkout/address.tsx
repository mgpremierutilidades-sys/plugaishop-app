// app/(tabs)/checkout/address.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import { useCart } from "../../../context/CartContext";
import type { OrderDraft } from "../../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

type AddressForm = {
  cep: string;
  number: string;
  complement: string;
  street: string;
  district: string;
  cityUf: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

export default function CheckoutAddress() {
  const goBack = () => router.back();
  const push = (path: string) => router.push(path as any);

  const cart = useCart() as any;

  const [form, setForm] = useState<AddressForm>({
    cep: "",
    number: "",
    complement: "",
    street: "",
    district: "",
    cityUf: "",
  });

  const canContinue = useMemo(() => {
    const cepOk = onlyDigits(form.cep).length === 8;
    const numberOk = form.number.trim().length > 0;
    const streetOk = form.street.trim().length > 0;
    const districtOk = form.district.trim().length > 0;
    const cityOk = form.cityUf.trim().length > 0;
    return cepOk && numberOk && streetOk && districtOk && cityOk;
  }, [form]);

  async function persistAddressAndContinue() {
    if (!canContinue) return;

    const current = (await loadOrderDraft()) as any as OrderDraft | null;

    const base: OrderDraft =
      current ??
      ({
        items: Array.isArray(cart?.items) ? cart.items : [],
        subtotal: Number(cart?.subtotal ?? 0) || 0,
        discount: Number(cart?.discountTotal ?? 0) || 0,
        total: Number(cart?.total ?? 0) || 0,
      } as any);

    const address = {
      cep: safeText(form.cep),
      number: safeText(form.number),
      complement: safeText(form.complement),
      street: safeText(form.street),
      district: safeText(form.district),
      cityUf: safeText(form.cityUf),
    };

    await saveOrderDraft({
      ...base,
      address,
    } as any);

    push("/(tabs)/checkout/shipping");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // Offset real para iPhone: header (~44) + folga do teclado/sugestões
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
              <ThemedText style={styles.backIcon}>←</ThemedText>
            </Pressable>

            <ThemedText style={styles.title}>Endereço</ThemedText>
            <View style={styles.rightSpacer} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentInsetAdjustmentBehavior={Platform.OS === "ios" ? "automatic" : undefined}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Informe seu endereço</ThemedText>

              <ThemedText style={styles.label}>CEP</ThemedText>
              <TextInput
                value={form.cep}
                onChangeText={(t) => setForm((p) => ({ ...p, cep: maskCep(t) }))}
                placeholder="00000-000"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.input}
                maxLength={9}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="next"
              />

              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.label}>Número</ThemedText>
                  <TextInput
                    value={form.number}
                    onChangeText={(t) => setForm((p) => ({ ...p, number: t }))}
                    placeholder="Nº"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    style={styles.input}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.label}>Complemento</ThemedText>
                  <TextInput
                    value={form.complement}
                    onChangeText={(t) => setForm((p) => ({ ...p, complement: t }))}
                    placeholder="Apto, casa..."
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <ThemedText style={styles.label}>Rua</ThemedText>
              <TextInput
                value={form.street}
                onChangeText={(t) => setForm((p) => ({ ...p, street: t }))}
                placeholder="Nome da rua"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCorrect={false}
                returnKeyType="next"
              />

              <ThemedText style={styles.label}>Bairro</ThemedText>
              <TextInput
                value={form.district}
                onChangeText={(t) => setForm((p) => ({ ...p, district: t }))}
                placeholder="Seu bairro"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCorrect={false}
                returnKeyType="next"
              />

              <ThemedText style={styles.label}>Cidade/UF</ThemedText>
              <TextInput
                value={form.cityUf}
                onChangeText={(t) => setForm((p) => ({ ...p, cityUf: t }))}
                placeholder="Goiânia/GO"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <Pressable
                onPress={persistAddressAndContinue}
                style={[styles.primaryBtn, !canContinue ? styles.primaryBtnDisabled : null]}
                accessibilityRole="button"
                disabled={!canContinue}
              >
                <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
              </Pressable>

              {!canContinue ? (
                <ThemedText style={styles.hint}>
                  Preencha CEP, número, rua, bairro e cidade/UF para continuar.
                </ThemedText>
              ) : null}
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  kav: { flex: 1, backgroundColor: theme.colors.background },

  container: { flex: 1, paddingHorizontal: 14, paddingTop: 4, backgroundColor: theme.colors.background },

  // Mais espaço inferior para nunca “comer” Cidade/UF no iPhone + footer do teclado
  scrollContent: { paddingBottom: 220 },

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

  label: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.9, marginTop: 10, marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    backgroundColor: theme.colors.surface,
  },

  twoCols: { flexDirection: "row", gap: 10 },

  primaryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    textTransform: "uppercase",
  },

  hint: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY, opacity: 0.75 },
});
