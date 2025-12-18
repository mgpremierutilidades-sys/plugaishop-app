import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import theme, { Radius, Spacing } from "../../constants/theme";

type Props = {
  title: string;
  price: string;
  oldPrice?: string;
  installmentText?: string;
  onPress: () => void;
};

export default function ProductCard({
  title,
  price,
  oldPrice,
  installmentText,
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imagePlaceholder} />

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        {oldPrice ? <Text style={styles.oldPrice}>{oldPrice}</Text> : null}
      </View>

      {installmentText ? (
        <Text style={styles.installments}>{installmentText}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.price,
  },
  oldPrice: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
  },
  installments: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
