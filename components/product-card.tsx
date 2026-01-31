// components/product-card.tsx
import { Image } from "expo-image";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import theme from "../constants/theme";
import type { Product } from "../data/catalog";
import { formatCurrency } from "../utils/formatCurrency";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type ProductCardProps = {
  product: Product;
  position?: number;

  /**
   * API nova (Etapa 3): recebe productId e posição
   */
  onPressProduct?: (productId: string, position?: number) => void;

  /**
   * API legada (compat): sem argumentos.
   * Mantida para não quebrar usos existentes fora da Home.
   */
  onPress?: () => void;
};

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function ProductCardBase({ product, position, onPressProduct, onPress }: ProductCardProps) {
  const productId = String((product as any).id ?? "");
  const title = safeText((product as any).title) || "Produto";
  const category = safeText((product as any).category);
  const description = safeText((product as any).description);
  const price = Number((product as any).price) || 0;

  // image pode ser string (url) ou require(...) dependendo do seu catálogo
  const rawImg = (product as any).image;
  const imageSource = typeof rawImg === "string" ? { uri: rawImg } : rawImg ? rawImg : undefined;

  const handlePress = useCallback(() => {
    // Compat primeiro: se alguém usa API legada, respeitar.
    if (onPress) {
      onPress();
      return;
    }
    if (onPressProduct) {
      onPressProduct(productId, position);
    }
  }, [onPress, onPressProduct, productId, position]);

  const enabled = Boolean(onPress || onPressProduct);

  return (
    <Pressable onPress={handlePress} disabled={!enabled} style={{ borderRadius: 16 }}>
      <ThemedView style={styles.card}>
        <View style={styles.header}>
          <ThemedText style={styles.category} numberOfLines={1}>
            {category || "Categoria"}
          </ThemedText>
        </View>

        <View style={styles.imageWrap}>
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
        </View>

        <View style={styles.info}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>

          {description ? (
            <ThemedText style={styles.desc} numberOfLines={3}>
              {description}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.price}>{formatCurrency(price)}</ThemedText>
          <ThemedText style={styles.link}>{enabled ? "Ver detalhes" : ""}</ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);
ProductCard.displayName = "ProductCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  category: {
    fontSize: 12,
    opacity: 0.9,
  },

  imageWrap: {
    marginTop: 10,
  },

  image: {
    width: "100%",
    height: 160,
  },

  imageFallback: {
    backgroundColor: theme.colors.surfaceAlt,
  },

  info: {
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  title: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
  },

  desc: {
    fontSize: 12,
    opacity: 0.8,
    fontFamily: "OpenSans_400Regular",
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
  },

  link: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: "OpenSans_700Bold",
  },
});
