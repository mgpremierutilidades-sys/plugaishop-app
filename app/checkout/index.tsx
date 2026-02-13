// app/checkout/index.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import theme from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";

function Row({ left, right }: { left: string; right: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
      }}
    >
      <Text style={{ fontSize: 14, color: theme.colors.text }}>{left}</Text>
      <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: "600" }}>{right}</Text>
    </View>
  );
}

export default function CheckoutIndexScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Finalizar compra" showBack />

      <View style={{ flex: 1, padding: 16, paddingTop: 12 }}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 16, paddingBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text }}>
              Resumo
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <Row left="Entrega" right="Endereço + Frete" />
            <Row left="Pagamento" right="Selecionar forma" />
            <Row left="Revisão" right="Conferir pedido" />
          </View>

          <View style={{ padding: 16 }}>
            <Pressable
              onPress={() => router.push("/checkout/address")}
              style={{
                backgroundColor: theme.colors.success,
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "800", color: "#000" }}>
                CONTINUAR
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.text }}>JOGOS</Text>
          <Text style={{ marginTop: 6, fontSize: 13, opacity: 0.75, color: theme.colors.text }}>
            Desafios, prêmios e novidades
          </Text>
        </View>

        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.text }}>VÍDEOS</Text>
          <Text style={{ marginTop: 6, fontSize: 13, opacity: 0.75, color: theme.colors.text }}>
            Conteúdo rápido e ofertas
          </Text>
        </View>
      </View>
    </View>
  );
}
