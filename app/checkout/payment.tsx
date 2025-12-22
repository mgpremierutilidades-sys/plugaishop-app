import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import theme from "../../constants/theme";
import type { OrderDraft, Payment } from "../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { createPayment, createPaymentPayload } from "../../utils/paymentBridge";

type Method = Payment["method"];

function Label({ children }: { children: string }) {
  return <Text style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>{children}</Text>;
}

function CardOption({
  title,
  subtitle,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.divider,
        backgroundColor: theme.colors.surface,
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "bold" }}>{title}</Text>
      <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</Text>
    </Pressable>
  );
}

export default function PaymentScreen() {
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [method, setMethod] = useState<Method>("pix");

  // mock card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardBrand, setCardBrand] = useState<"visa" | "mastercard" | "elo" | "amex" | "other">("other");

  useEffect(() => {
    (async () => {
      const d = await loadOrderDraft();
      setDraft(d);

      const m = d?.payment?.method;
      if (m) setMethod(m);
    })();
  }, []);

  const canContinue = useMemo(() => {
    if (!draft) return false;
    if (method === "card") return cardNumber.replace(/\D/g, "").length >= 12; // mock mínimo
    return true;
  }, [draft, method, cardNumber]);

  async function handleContinue() {
    if (!draft) return;

    const payment = createPayment(method);

    // payload mock (útil para log/integração futura)
    const last4 = cardNumber.replace(/\D/g, "").slice(-4);
    const payload =
      method === "card"
        ? createPaymentPayload("card", { last4, brand: cardBrand })
        : createPaymentPayload(method);

    const next = patchOrderDraft(draft, {
      payment,
      // opcional: você pode guardar payload em outro lugar depois (Orders/Back-end)
    });

    await saveOrderDraft(next);

    // segue para revisão
    router.push("/checkout/review");
  }

  if (!draft) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16 }}>Carregando pagamento...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Pagamento</Text>

      <Label>Escolha um método</Label>

      <CardOption
        title="Pix"
        subtitle="Aprovação rápida"
        active={method === "pix"}
        onPress={() => setMethod("pix")}
      />

      <CardOption
        title="Cartão"
        subtitle="Crédito / Débito (mock)"
        active={method === "card"}
        onPress={() => setMethod("card")}
      />

      <CardOption
        title="Boleto"
        subtitle="Vencimento em 2 dias (mock)"
        active={method === "boleto"}
        onPress={() => setMethod("boleto")}
      />

      {method === "card" ? (
        <View style={{ marginTop: 10 }}>
          <Label>Número do cartão (mock)</Label>
          <TextInput
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="number-pad"
            placeholder="0000 0000 0000 0000"
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

          <Label>Bandeira (mock)</Label>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(["visa", "mastercard", "elo", "amex", "other"] as const).map((b) => {
              const active = cardBrand === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => setCardBrand(b)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.primary : theme.colors.divider,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: active ? "bold" : "normal" }}>
                    {b.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={handleContinue}
        disabled={!canContinue}
        style={{
          marginTop: 18,
          backgroundColor: theme.colors.success,
          padding: 14,
          borderRadius: 12,
          opacity: canContinue ? 1 : 0.5,
        }}
      >
        <Text style={{ color: "#000", fontWeight: "bold", textAlign: "center" }}>
          Continuar
        </Text>
      </Pressable>
    </View>
  );
}
