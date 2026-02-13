// app/checkout/payment.tsx
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
import type { OrderDraft, Payment } from "../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { createPayment, createPaymentPayload } from "../../utils/paymentBridge";
import { AppHeader, HEADER_HEIGHT } from "../../components/AppHeader";

const FOOTER_H = 56;

type Method = Payment["method"];

function Label({ children }: { children: string }) {
  return (
    <Text
      style={{
        marginTop: 12,
        fontSize: 12,
        opacity: 0.7,
        color: theme.colors.text,
      }}
    >
      {children}
    </Text>
  );
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
      <Text
        style={{ fontSize: 12, fontWeight: "bold", color: theme.colors.text }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 12,
          opacity: 0.7,
          marginTop: 4,
          color: theme.colors.text,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [method, setMethod] = useState<Method>("pix");

  const [cardNumber, setCardNumber] = useState("");
  const [cardBrand, setCardBrand] = useState<
    "visa" | "mastercard" | "elo" | "amex" | "other"
  >("other");

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
    if (method === "card") return cardNumber.replace(/\D/g, "").length >= 12;
    return true;
  }, [draft, method, cardNumber]);

  async function handleContinue() {
    if (!draft) return;

    const payment = createPayment(method);

    const last4 = cardNumber.replace(/\D/g, "").slice(-4);
    const payload =
      method === "card"
        ? createPaymentPayload("card", { last4, brand: cardBrand })
        : createPaymentPayload(method);

    if (__DEV__) (globalThis as any).__lastPaymentPayload = payload;

    const next = patchOrderDraft(draft, { payment });
    await saveOrderDraft(next);

    router.push("/checkout/review");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Pagamento" showBack />

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
              Carregando pagamento...
            </Text>
          ) : (
            <>
              <Label>Escolha uma forma</Label>

              <CardOption
                title="Pix"
                subtitle="Aprovação imediata"
                active={method === "pix"}
                onPress={() => setMethod("pix")}
              />
              <CardOption
                title="Cartão de crédito"
                subtitle="Parcelamento disponível (mock)"
                active={method === "card"}
                onPress={() => setMethod("card")}
              />
              <CardOption
                title="Boleto"
                subtitle="Compensação em até 2 dias úteis (mock)"
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

                  <Label>Bandeira (mock)</Label>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {(
                      ["visa", "mastercard", "elo", "amex", "other"] as const
                    ).map((b) => {
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
                            borderColor: active
                              ? theme.colors.primary
                              : theme.colors.divider,
                            backgroundColor: theme.colors.surface,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: active ? "bold" : "normal",
                              color: theme.colors.text,
                            }}
                          >
                            {b.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
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
            disabled={!canContinue}
            style={{
              height: FOOTER_H,
              backgroundColor: theme.colors.success,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: canContinue ? 1 : 0.5,
            }}
          >
            <Text
              style={{ color: "#000", fontWeight: "800", textAlign: "center" }}
            >
              CONTINUAR
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
