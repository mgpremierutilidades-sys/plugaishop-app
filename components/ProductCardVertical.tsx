import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "../constants/theme";
import type { Product } from "../data/catalog";

export default function ProductCardVertical({
  item,
  onPress,
}: {
  item: Product;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
    >
      <View style={styles.thumb} />

      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.priceCurrent} numberOfLines={1}>
          {item.price}
        </Text>

        {!!item.oldPrice && (
          <Text style={styles.priceOld} numberOfLines={1}>
            {item.oldPrice}
          </Text>
        )}
      </View>

      <Text style={styles.installments} numberOfLines={1}>
        {item.installmentText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  thumb: {
    width: "78%",
    height: 86,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSoft,
    marginBottom: Spacing.md,
  },

  // Antes estava grande demais (22/900). Agora no padrão das outras telas.
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },

  priceCurrent: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.price,
  },

  priceOld: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },

  installments: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
