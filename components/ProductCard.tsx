import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import theme from "../constants/theme";

type Props = {
  title: string;
  price: string;
  oldPrice?: string;
  badge?: string;
  installmentText?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function ProductCard({
  title,
  price,
  oldPrice,
  badge,
  installmentText,
  onPress,
  style,
}: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, style]}>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="clip">
            {badge}
          </Text>
        </View>
      )}

      {/* Placeholder SEM texto */}
      <View style={styles.imagePlaceholder} />

      <Text style={styles.title} numberOfLines={2} ellipsizeMode="clip">
        {title}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price} numberOfLines={1} ellipsizeMode="clip">
          {price}
        </Text>

        {!!oldPrice && (
          <Text style={styles.oldPrice} numberOfLines={1} ellipsizeMode="clip">
            {oldPrice}
          </Text>
        )}
      </View>

      {!!installmentText && (
        <Text style={styles.installments} numberOfLines={1} ellipsizeMode="clip">
          {installmentText}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: theme.spacing.md,
    overflow: "hidden",
  },

  badge: {
    position: "absolute",
    zIndex: 2,
    top: 10,
    left: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FDE68A",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },

  imagePlaceholder: {
    height: 92,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },

  title: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    lineHeight: 19,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 2,
  },
  price: {
    ...theme.typography.priceMain,
  },
  oldPrice: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
  },

  installments: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
