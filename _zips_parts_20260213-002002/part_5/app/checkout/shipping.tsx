// app/checkout/shipping.tsx
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
import { router } from "expo-router";

import theme from "../../constants/theme";
import type { OrderDraft } from "../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { formatCEP, normalizeCEP, isValidCEP } from "../../utils/cep";
import { getShippingOptions } from "../../utils/shippingService";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { AppHeader, HEADER_HEIGHT } from "../../components/AppHeader";

const FOOTER_H = 56;

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`.replace(".", ",");
}

export default function ShippingScreen() {
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [cep, setCep] = useState("");
  const [selectedId, setSelectedId] = useState<"pac" | "sedex" | "express">("pac");

  useEffect(() => {
    (async () => {
      const d = await loadOrderDraft();
      setDraft(d);

      const initialCep = d?.address?.zip ?? "";
      setCep(formatCEP(initialCep));
      if (d?.shipping?.method?.toLowerCase().includes("sedex")) setSelectedId("sedex");
      if (d?.shipping?.method?.toLowerCase().includes("express")) setSelectedId("express");
    })();
  }, []);

  const options = useMemo(() => getShippingOptions(cep), [cep]);
  const selected = useMemo(
    () => options.find((o) => o.id === selectedId) ?? options[0],
    [options, selectedId]
  );

  const zip8 = normalizeCEP(cep);
  const valid = isValidCEP(zip8);

  async function handleContinue() {
    if (!draft) return;
    if (!valid) return;

    const next = patchOrderDraft(draft, {
      address: { ...(draft.address ?? { id: "addr-1" }), zip: zip8 } as any,
      shipping: { method: selected.method, price: selected.price, deadline: selected.deadline },
    });

    await saveOrderDraft(next);
    router.push("/checkout/payment");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Frete" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={HEADER_HEIGHT + insets.top}
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
            <Text style={{ fontSize: 16, color: theme.colors.text }}>Carregando frete...</Text>
          ) : (
            <>
              <Text style={{ marginTop: 2, fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
                Digite seu CEP
              </Text>

              <TextInput
                value={cep}
                onChangeText={(t) => setCep(formatCEP(t))}
                keyboardType="number-pad"
                placeholder="00000-000"
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

              <View style={{ marginTop: 14 }}>
                {options.map((o) => {
                  const active = o.id === selectedId;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setSelectedId(o.id)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: active ? theme.colors.primary : theme.colors.divider,
                        backgroundColor: theme.colors.surface,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "bold", color: theme.colors.text }}>
                        {o.method}
                      </Text>
                      <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4, color: theme.colors.text }}>
                        {o.deadline} • {o.price > 0 ? formatBRL(o.price) : "—"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
                Integração futura: cálculo real por CEP. Por ora, opções simuladas.
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
            disabled={!draft || !valid}
            style={{
              height: FOOTER_H,
              backgroundColor: theme.colors.success,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: draft && valid ? 1 : 0.5,
            }}
          >
            <Text style={{ color: "#000", fontWeight: "800", textAlign: "center" }}>
              CONTINUAR
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
