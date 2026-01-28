// app/product/[id].tsx
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { formatCurrency } from "../../utils/formatCurrency";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function toImageSource(raw: any) {
  // expo-image aceita require(...) direto e também { uri }
  if (!raw) return undefined;
  if (typeof raw === "string") return { uri: raw };
  return raw;
}

export default function ProductDetails() {
  const params = useLocalSearchParams();
  const cart = useCart() as any;

  const id = String((params as any)?.id ?? "");
  const product = (products as Product[]).find((p: any) => String(p?.id) === id) as any;

  const goBack = () => router.back();

  const addToCart = () => {
    if (!product) return;

    // padrão do seu CartContext atual
    if (typeof cart?.addItem === "function") {
      cart.addItem(product, 1);
      return;
    }

    // compat (se existir em versões antigas)
    if (typeof cart?.add === "function") cart.add(product);
  };

  const goCart = () => router.push("/(tabs)/cart" as any);

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
              <ThemedText style={styles.backIcon}>←</ThemedText>
            </Pressable>

            <ThemedText style={styles.title}>Produto</ThemedText>
            <View style={styles.rightSpacer} />
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.h1}>Produto não encontrado</ThemedText>
            <ThemedText style={styles.p}>Não foi possível carregar o item solicitado.</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const title = safeText(product?.title) || "Produto";
  const price = Number(product?.price ?? 0);
  const description = safeText(product?.description);
  const category = safeText(product?.category);

  const imageSource = toImageSource(product?.image);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Detalhes</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={styles.card}>
            <ThemedText style={styles.category}>{category || "Categoria"}</ThemedText>

            {imageSource ? (
              <Image
                source={imageSource}
                contentFit="cover"
                transition={150}
                style={styles.image}
                accessibilityLabel={title}
              />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}

            <ThemedText style={styles.h1}>{title}</ThemedText>

            <ThemedText style={styles.price}>{formatCurrency(price)}</ThemedText>

            {description ? <ThemedText style={styles.p}>{description}</ThemedText> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={addToCart} style={styles.primaryBtn} accessibilityRole="button">
            <ThemedText style={styles.primaryBtnText}>Adicionar ao carrinho</ThemedText>
          </Pressable>

          <Pressable onPress={goCart} style={styles.secondaryBtn} accessibilityRole="button">
            <ThemedText style={styles.secondaryBtnText}>Ir para o carrinho</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 6, backgroundColor: theme.colors.background },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },

  category: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.8, marginBottom: 10 },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 12,
  },
  imageFallback: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  h1: { fontSize: 16, fontFamily: FONT_BODY_BOLD, marginBottom: 6 },
  price: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary, marginBottom: 10 },
  p: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85, lineHeight: 16 },

  footer: { position: "absolute", left: 14, right: 14, bottom: 10, gap: 10 },

  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD, textTransform: "uppercase" },

  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: theme.colors.text, fontSize: 12, fontFamily: FONT_BODY_BOLD, textTransform: "uppercase" },
});
