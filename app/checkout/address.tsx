// app/checkout/address.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader, HEADER_HEIGHT } from "../../components/AppHeader";
import theme from "../../constants/theme";
import type { OrderDraft } from "../../types/order";
import { formatCEP, isValidCEP, normalizeCEP } from "../../utils/cep";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";

const FOOTER_H = 56;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 12, opacity: 0.7, color: theme.colors.text }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="rgba(0,0,0,0.35)"
        style={{
          marginTop: 8,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
        }}
      />
    </View>
  );
}

export default function AddressScreen() {
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<OrderDraft | null>(null);

  const [cep, setCep] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [cityUf, setCityUf] = useState("");

  useEffect(() => {
    (async () => {
      const d = await loadOrderDraft();
      setDraft(d);

      const a: any = d?.address ?? {};
      setCep(formatCEP(a.zip ?? ""));
      setNumber(String(a.number ?? ""));
      setComplement(String(a.complement ?? ""));
      setStreet(String(a.street ?? ""));
      setDistrict(String(a.district ?? ""));
      setCityUf(String(a.cityUf ?? ""));
    })();
  }, []);

  const zip8 = useMemo(() => normalizeCEP(cep), [cep]);
  const valid = useMemo(() => {
    return (
      !!draft &&
      isValidCEP(zip8) &&
      number.trim().length > 0 &&
      street.trim().length > 0 &&
      district.trim().length > 0 &&
      cityUf.trim().length > 0
    );
  }, [draft, zip8, number, street, district, cityUf]);

  async function handleContinue() {
    if (!draft) return;
    if (!valid) return;

    const next = patchOrderDraft(draft, {
      address: {
        ...(draft.address ?? { id: "addr-1" }),
        zip: zip8,
        number: number.trim(),
        complement: complement.trim(),
        street: street.trim(),
        district: district.trim(),
        cityUf: cityUf.trim(),
      } as any,
    });

    await saveOrderDraft(next);
    router.push("/checkout/shipping");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Endereço" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? HEADER_HEIGHT + insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 16,
            paddingTop: 12,
            paddingBottom: 16 + FOOTER_H + 14 + insets.bottom,
          }}
        >
          {!draft ? (
            <Text style={{ fontSize: 16, color: theme.colors.text }}>Carregando endereço...</Text>
          ) : (
            <>
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.text }}>
                Informe seu endereço
              </Text>

              <Field
                label="CEP"
                value={cep}
                onChangeText={(t) => setCep(formatCEP(t))}
                placeholder="00000-000"
                keyboardType="number-pad"
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Número"
                    value={number}
                    onChangeText={setNumber}
                    placeholder="Nº"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Complemento"
                    value={complement}
                    onChangeText={setComplement}
                    placeholder="Apto, casa..."
                  />
                </View>
              </View>

              <Field label="Rua" value={street} onChangeText={setStreet} placeholder="Nome da rua" />
              <Field label="Bairro" value={district} onChangeText={setDistrict} placeholder="Seu bairro" />
              <Field label="Cidade/UF" value={cityUf} onChangeText={setCityUf} placeholder="Goiânia/GO" />

              <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
                Preencha CEP, número, rua, bairro e cidade/UF para continuar.
              </Text>
            </>
          )}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10 + insets.bottom,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            backgroundColor: theme.colors.background,
          }}
        >
          <Pressable
            onPress={handleContinue}
            disabled={!valid}
            style={{
              height: FOOTER_H,
              backgroundColor: theme.colors.success,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: valid ? 1 : 0.5,
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "800", color: "#000" }}>CONTINUAR</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
