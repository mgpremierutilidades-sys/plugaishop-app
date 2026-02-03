import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import theme from "../../constants/theme";
import type { OrderDraft } from "../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { formatCEP, normalizeCEP, isValidCEP } from "../../utils/cep";
import { getShippingOptions } from "../../utils/shippingService";
import { patchOrderDraft } from "../../utils/orderDraftPatch";

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`.replace(".", ",");
}

export default function ShippingScreen() {
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

  async function handleContinue() {
    if (!draft) return;

    const zip8 = normalizeCEP(cep);
    if (!isValidCEP(zip8)) return;

    const next = patchOrderDraft(draft, {
      address: { ...(draft.address ?? { id: "addr-1" }), zip: zip8 },
      shipping: { method: selected.method, price: selected.price, deadline: selected.deadline },
    });

    await saveOrderDraft(next);
    router.push("/checkout/review");
  }

  if (!draft) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16 }}>Carregando frete...</Text>
      </View>
    );
  }

  const zip8 = normalizeCEP(cep);
  const valid = isValidCEP(zip8);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Frete</Text>

      <Text style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>Digite seu CEP</Text>

      <TextInput
        value={cep}
        onChangeText={(t) => setCep(formatCEP(t))}
        keyboardType="number-pad"
        placeholder="00000-000"
        style={{
          marginTop: 8,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          backgroundColor: theme.colors.surface,
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
              <Text style={{ fontSize: 12, fontWeight: "bold" }}>{o.method}</Text>
              <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {o.deadline} • {o.price > 0 ? formatBRL(o.price) : "—"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleContinue}
        disabled={!valid}
        style={{
          marginTop: 10,
          backgroundColor: theme.colors.success,
          padding: 14,
          borderRadius: 12,
          opacity: valid ? 1 : 0.5,
        }}
      >
        <Text style={{ color: "#000", fontWeight: "bold", textAlign: "center" }}>
          Continuar
        </Text>
      </Pressable>
    </View>
  );
}
