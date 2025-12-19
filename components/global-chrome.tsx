import { router, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BACK_BUTTON_MARGIN, FOOTER_PADDING, getFooterOffset } from "@/constants/layout";
import theme from "@/constants/theme";

export function GlobalChrome() {
  const insets = useSafeAreaInsets();
  const footerOffset = getFooterOffset(insets.bottom);

  // Tipagem do expo-router pode vir como never[] dependendo do setup.
  // Forçamos para string[] para evitar o erro do TypeScript.
  const segments = useSegments() as unknown as string[];

  // Ex.: ["(tabs)", "cart"] quando está no carrinho do tab
  const isCartTab = segments.includes("(tabs)") && segments.includes("cart");

  const handleBack = () => {
    const canGoBack =
      typeof (router as any)?.canGoBack === "function" ? (router as any).canGoBack() : false;

    if (canGoBack) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        accessibilityHint="Retorna para a tela anterior"
        onPress={handleBack}
        style={[
          styles.backButton,
          {
            top: insets.top + BACK_BUTTON_MARGIN,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        <Text style={[styles.backIcon, { color: theme.colors.text }]}>{"<"}</Text>
      </Pressable>

      {/* Rodapé global: NÃO renderiza no Carrinho */}
      {!isCartTab ? (
        <View
          accessibilityLabel="Rodapé fixo"
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              paddingBottom: FOOTER_PADDING + insets.bottom,
              borderTopColor: theme.colors.divider,
              minHeight: footerOffset,
            },
          ]}
        >
          <Text style={[styles.footerTitle, { color: theme.colors.text }]}>Rodapé fixo</Text>
          <Text style={[styles.footerText, { color: theme.colors.text }]}>
            Este rodapé permanece visível em todas as telas para navegação e contexto rápidos.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    left: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  backIcon: {
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: FOOTER_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  footerTitle: { fontWeight: "800" },
  footerText: { lineHeight: 18, opacity: 0.8 },
});
