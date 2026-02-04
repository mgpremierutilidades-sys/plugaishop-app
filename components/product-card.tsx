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

export function ProductCard({ product, onPress }: ProductCardProps) {
  // não altera UI: mantemos como noop (compatibilidade sem mexer no layout)
  void onPress;

  const background = useThemeColor({ light: "#F7FBFF", dark: "#0F1115" }, "background");
  const accent = useThemeColor({ light: "#0a7ea4", dark: "#7AC4FF" }, "tint");

  return (
    <ThemedView style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">{product.category}</ThemedText>
        {product.badge ? (
          <ThemedText style={[styles.badge, { color: accent }]}>{product.badge}</ThemedText>
        ) : null}
      </View>

      <Image
        source={product.image}
        contentFit="cover"
        transition={150}
        style={styles.image}
        accessibilityLabel={product.name}
      />

      <View style={styles.info}>
        <ThemedText type="subtitle" numberOfLines={2}>
          {product.name}
        </ThemedText>
        <ThemedText numberOfLines={3}>{product.description}</ThemedText>
      </View>

      <View style={styles.footer}>
        <ThemedText type="defaultSemiBold">R$ {product.price.toFixed(2)}</ThemedText>
        <ThemedText type="link">Ver detalhes</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D5DDE5",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  badge: {
    fontSize: 12,
  },
  image: {
    width: "100%",
    height: 160,
  },
  info: {
    gap: 6,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
