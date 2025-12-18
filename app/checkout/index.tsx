// app/checkout/index.tsx
import { Stack, router } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonPrimary from "../../components/ButtonPrimary";
import IconSymbol from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type PaymentMethodId = "pix" | "card" | "boleto";

export default function CheckoutScreen() {
  // Valores simulados – depois podem vir do carrinho real / API
  const subtotal = 1899.9;
  const shipping = 39.9;
  const discount = 50;
  const total = subtotal + shipping - discount;

  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethodId>("pix");
  const [observations, setObservations] = React.useState("");

  const handleBack = () => {
    // back seguro
    try {
      router.back();
    } catch {
      router.replace("/" as any);
    }
  };

  return (
    <>
      {/* Remove QUALQUER header/back automático do Expo Router nesta tela */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Banner padronizado no topo + VOLTAR ÚNICO sobre o banner */}
          <View style={styles.bannerWrapper}>
            <Image
              source={require("../../assets/banners/banner-home.png")}
              style={styles.banner}
              resizeMode="cover"
            />

            <Pressable onPress={handleBack} style={styles.backOverlay} hitSlop={12}>
              <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Cabeçalho */}
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Finalizar compra</Text>
            <Text style={styles.screenSubtitle}>
              Revise os dados antes de concluir seu pedido na Plugaí Shop.
            </Text>
          </View>

          {/* Resumo da compra */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo da compra</Text>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Subtotal</Text>
                <Text style={styles.value}>{formatCurrencyBRL(subtotal)}</Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.label}>Frete estimado</Text>
                <Text style={styles.value}>{formatCurrencyBRL(shipping)}</Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.label}>Descontos</Text>
                <Text style={styles.valueDiscount}>
                  - {formatCurrencyBRL(discount)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.rowBetween}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrencyBRL(total)}</Text>
              </View>

              <Text style={styles.caption}>
                Valores simulados para esta versão do app. No futuro, serão
                trazidos diretamente do carrinho real (Nuvemshop / ERP / hubs).
              </Text>
            </View>
          </View>

          {/* Endereço de entrega (preview) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Endereço de entrega</Text>

            <View style={styles.card}>
              <Text style={styles.labelStrong}>Marcelo Oliveira</Text>
              <Text style={styles.addressLine}>
                Rua P-30, nº 250, Qd. P-99 Lt. 07, 2º Andar
              </Text>
              <Text style={styles.addressLine}>
                Setor dos Funcionários · Goiânia/GO · 74543-440
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.inlineLinkButton}
                onPress={() => router.push("/account/addresses")}
              >
                <Text style={styles.inlineLinkText}>Editar endereços</Text>
              </TouchableOpacity>

              <Text style={styles.caption}>
                Em versões futuras, você poderá selecionar e salvar múltiplos
                endereços e preferências de entrega.
              </Text>
            </View>
          </View>

          {/* Forma de pagamento */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forma de pagamento</Text>

            <View style={styles.card}>
              <View style={styles.paymentOptionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod("pix")}
                  style={[
                    styles.paymentOption,
                    paymentMethod === "pix" && styles.paymentOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === "pix" && styles.paymentOptionTextActive,
                    ]}
                  >
                    Pix
                  </Text>
                  <Text style={styles.paymentOptionCaption}>
                    Confirmação rápida
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod("card")}
                  style={[
                    styles.paymentOption,
                    paymentMethod === "card" && styles.paymentOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === "card" && styles.paymentOptionTextActive,
                    ]}
                  >
                    Cartão
                  </Text>
                  <Text style={styles.paymentOptionCaption}>
                    Crédito em até 12x
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod("boleto")}
                  style={[
                    styles.paymentOption,
                    paymentMethod === "boleto" && styles.paymentOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === "boleto" &&
                        styles.paymentOptionTextActive,
                    ]}
                  >
                    Boleto
                  </Text>
                  <Text style={styles.paymentOptionCaption}>
                    Compensação em até 2 dias úteis
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.caption}>
                Nesta versão, os métodos são ilustrativos. A camada real de
                pagamento (gateway, antifraude, parcelamento) será integrada na
                próxima fase do projeto.
              </Text>
            </View>
          </View>

          {/* Observações do pedido */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações ao lojista</Text>

            <View style={styles.card}>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Ex.: Portão marrom, deixar na portaria, ligar antes de entregar..."
                placeholderTextColor={theme.colors.textMuted}
                value={observations}
                onChangeText={setObservations}
              />
            </View>
          </View>

          {/* CTA final */}
          <View style={styles.section}>
            <ButtonPrimary
              title="Confirmar pedido"
              onPress={() => {
                console.log("Confirmar pedido - método:", paymentMethod, {
                  subtotal,
                  shipping,
                  discount,
                  total,
                  observations,
                });
                router.push("/checkout/confirmation" as any);
              }}
            />

            <Text style={styles.footerInfo}>
              Ao confirmar, você verá o pedido refletido na área "Meus pedidos".
              Na fase de integração, este fluxo será conectado ao backend,
              Nuvemshop, ERP e gateways de pagamento.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },

  // Banner padronizado
  bannerWrapper: {
    marginHorizontal: -theme.spacing.lg,
    marginTop: 4,
    marginBottom: theme.spacing.md,
    position: "relative",
  },
  banner: {
    width: "100%",
    height: 180,
  },

  // VOLTAR ÚNICO (sobre o banner)
  backOverlay: {
    position: "absolute",
    top: -6, // sobe um pouco acima, como você pediu
    left: 12,
    zIndex: 20,
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary,
  },

  header: {
    marginBottom: theme.spacing.md,
  },
  screenTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
  },
  screenSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  labelStrong: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  value: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  valueDiscount: {
    ...theme.typography.bodyStrong,
    color: theme.colors.price,
  },
  totalLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  totalValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.price,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.sm,
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  addressLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  inlineLinkButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  inlineLinkText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },

  // Pagamento
  paymentOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  paymentOption: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  paymentOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  paymentOptionText: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  paymentOptionTextActive: {
    color: theme.colors.primaryDark,
  },
  paymentOptionCaption: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Observações
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: theme.spacing.sm,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlignVertical: "top",
  },

  footerInfo: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
