import { router, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import theme from "../constants/theme";

const BACK_BUTTON_MARGIN = 8;

export function GlobalChrome() {
  const insets = useSafeAreaInsets();

  // Em alguns setups, o Expo Router tipa segments como never[].
  // Cast explícito resolve e mantém a verificação funcional.
  const segments = useSegments() as unknown as string[];

  // Não renderiza nada no fluxo do Carrinho/Checkout (evita botão duplicado e qualquer “rodapé” global).
  const isInCartFlow = segments.includes("cart") || segments.includes("checkout");
  if (isInCartFlow) return null;

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
        <Text style={styles.backLabel}>‹</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  backLabel: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: -1,
  },
});
