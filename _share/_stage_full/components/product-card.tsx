// components/product-card.tsx
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import theme from "../constants/theme";
import type { Product } from "../data/catalog";
import { formatCurrency } from "../utils/formatCurrency";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type ProductCardProps = {
  product: Product;
  onPress?: () => void;
};

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const title = safeText((product as any).title) || "Produto";
  const category = safeText((product as any).category);
  const description = safeText((product as any).description);
  const price = Number((product as any).price) || 0;

  // image pode ser string (url) ou require(...) dependendo do seu catálogo
  const rawImg = (product as any).image;
  const imageSource =
    typeof rawImg === "string" ? { uri: rawImg } : rawImg ? rawImg : undefined;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ borderRadius: 16 }}>
      <ThemedView style={styles.card}>
        <View style={styles.header}>
          <ThemedText style={styles.category} numberOfLines={1}>
            {category || "Categoria"}
          </ThemedText>

          {/* espaço para badge futura (ex.: "OFERTA", "FRETE GRÁTIS") */}
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
          <ThemedText style={styles.link}>{onPress ? "Ver detalhes" : ""}</ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

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
