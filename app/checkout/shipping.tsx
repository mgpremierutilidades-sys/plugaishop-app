// app/checkout/shipping.tsx
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
import { getShippingOptions, type ShippingOption } from "../../utils/shippingService";

const FOOTER_H = 56;

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`.replace(".", ",");
}

type ShippingOptionId = "standard" | "express";

export default function ShippingScreen() {
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [cep, setCep] = useState("");
  const [selectedId, setSelectedId] = useState<ShippingOptionId>("standard");

  useEffect(() => {
    (async () => {
      const d = await loadOrderDraft();
      setDraft(d);

      const initialCep = d?.address?.zip ?? "";
      setCep(formatCEP(initialCep));

      const method = String(d?.shipping?.method ?? "").toLowerCase();
      if (method.includes("express")) setSelectedId("express");
      else setSelectedId("standard");
    })();
  }, []);

  const zip8 = normalizeCEP(cep);
  const valid = isValidCEP(zip8);

  const subtotal = useMemo(() => {
    // subtotal do draft (fallback 0)
    const s = Number(draft?.subtotal ?? 0);
    return Number.isFinite(s) ? s : 0;
  }, [draft?.subtotal]);

  const options = useMemo<ShippingOption[]>(() => {
    if (!valid) return [];
    return getShippingOptions({ cep: zip8, subtotal });
  }, [valid, zip8, subtotal]);

  const selected = useMemo<ShippingOption | null>(() => {
    if (!options.length) return null;
    return options.find((o: ShippingOption) => o.id === selectedId) ?? options[0];
  }, [options, selectedId]);

  async function handleContinue() {
    if (!draft) return;
    if (!valid) return;
    if (!selected) return;

    const next = patchOrderDraft(draft, {
      address: { ...(draft.address ?? { id: "addr-1" }), zip: zip8 },
      shipping: {
        method: selected.method,
        price: selected.price,
        deadline: selected.deadline,
      },
      // total permanece como está; caso você queira recalcular com frete,
      // faça isso no builder/bridge do checkout (melhor governança).
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
            <Text style={{ fontSize: 16, color: theme.colors.text }}>
              Carregando frete...
            </Text>
          ) : (
            <>
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  opacity: 0.7,
                  color: theme.colors.text,
                }}
              >
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
                {!valid ? (
                  <Text style={{ fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
                    Informe um CEP válido (8 dígitos).
                  </Text>
                ) : options.length === 0 ? (
                  <Text style={{ fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
                    Sem opções de frete para este CEP no mock.
                  </Text>
                ) : (
                  options.map((o: ShippingOption) => {
                    const active = o.id === selectedId;
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => setSelectedId(o.id as ShippingOptionId)}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: active
                            ? theme.colors.primary
                            : theme.colors.divider,
                          backgroundColor: theme.colors.surface,
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color: theme.colors.text,
                          }}
                        >
                          {o.title}
                        </Text>

                        <Text
                          style={{
                            fontSize: 12,
                            opacity: 0.7,
                            marginTop: 4,
                            color: theme.colors.text,
                          }}
                        >
                          {o.deadline} • {o.price > 0 ? formatBRL(o.price) : "Frete grátis"}
                        </Text>

                        {o.subtitle ? (
                          <Text
                            style={{
                              fontSize: 11,
                              opacity: 0.6,
                              marginTop: 3,
                              color: theme.colors.text,
                            }}
                          >
                            {o.subtitle}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </View>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  opacity: 0.7,
                  color: theme.colors.text,
                }}
              >
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
            disabled={!draft || !valid || !selected}
            style={{
              height: FOOTER_H,
              backgroundColor: theme.colors.success,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: draft && valid && selected ? 1 : 0.5,
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