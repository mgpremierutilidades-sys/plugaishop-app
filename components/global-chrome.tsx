import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BACK_BUTTON_MARGIN, FOOTER_PADDING, getFooterOffset } from "@/constants/layout";
import theme from "@/constants/theme";

export function GlobalChrome() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const footerOffset = getFooterOffset(insets.bottom);

  // Remove o rodapé SOMENTE no Carrinho (rota do Tab)
  const isCart =
    pathname === "/(tabs)/cart" ||
    pathname === "/cart" ||
    pathname.endsWith("/cart") ||
    pathname.includes("/(tabs)/cart");

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
        <Text style={styles.backLabel}>VOLTAR</Text>
      </Pressable>

      {!isCart && (
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
          <Text style={styles.footerTitle}>Rodapé fixo</Text>
          <Text style={styles.footerText}>
            Este rodapé permanece visível em todas as telas para navegação e contexto rápidos.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  backLabel: {
    fontWeight: "700",
    letterSpacing: 0.2,
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
  footerTitle: {
    fontWeight: "700",
  },
  footerText: {
    lineHeight: 18,
    opacity: 0.8,
  },
});
