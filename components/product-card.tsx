import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Product } from "@/constants/products";
import { useThemeColor } from "@/hooks/use-theme-color";

type ProductCardProps = {
  product: Product;
  onPress?: () => void; // compat: alguns chamadores passam onPress
};

/**
 * ProductCard (ML Density)
 * - Mais compacto: melhor descoberta e mais itens por viewport.
 * - Mantém compatibilidade com chamadores antigos.
 */
export function ProductCard({ product, onPress }: ProductCardProps) {
  void onPress;

  const background = useThemeColor({ light: "#FFFFFF", dark: "#0F1115" }, "background");
  const border = useThemeColor({ light: "#E6E8EC", dark: "#1F2937" }, "background");
  const accent = useThemeColor({ light: "#0a7ea4", dark: "#7AC4FF" }, "tint");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  return (
    <ThemedView style={[styles.card, { backgroundColor: background, borderColor: border }]}>
      <View style={styles.header}>
        <ThemedText style={styles.category} numberOfLines={1}>
          {product.category}
        </ThemedText>

        {product.badge ? (
          <ThemedText style={[styles.badge, { color: accent }]} numberOfLines={1}>
            {product.badge}
          </ThemedText>
        ) : (
          <View style={{ width: 1 }} />
        )}
      </View>

      <Image
        source={product.image}
        contentFit="cover"
        transition={120}
        style={styles.image}
        accessibilityLabel={product.name}
      />

      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {product.name}
        </ThemedText>

        <ThemedText style={[styles.desc, { color: muted }]} numberOfLines={2}>
          {product.description}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.price}>R$ {product.price.toFixed(2)}</ThemedText>
        <ThemedText style={[styles.link, { color: accent }]}>Ver</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },

  category: {
    fontSize: 11,
    fontWeight: "700",
  },

  badge: {
    fontSize: 11,
    fontWeight: "700",
  },

  image: {
    width: "100%",
    height: 120, // ↓ 160 -> 120 (mais denso)
    backgroundColor: "#EEF1F5",
  },

  info: {
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },

  title: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },

  desc: {
    fontSize: 12,
    lineHeight: 16,
  },

  footer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    fontSize: 13,
    fontWeight: "800",
  },

  link: {
    fontSize: 12,
    fontWeight: "800",
  },
});
