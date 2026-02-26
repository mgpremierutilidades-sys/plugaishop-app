import { View, StyleSheet } from "react-native";

import theme from "../../constants/theme";
import type { Review } from "../../types/review";
import { ThemedText } from "../themed-text";

type Props = {
  review: Review;
  showVerifiedBadge: boolean;
};

function Stars({ rating }: { rating: number }) {
  const r = Math.max(1, Math.min(5, rating));
  const full = "★".repeat(r);
  const empty = "☆".repeat(5 - r);
  return (
    <ThemedText type="caption" style={{ color: theme.colors.warning }}>
      {full}
      <ThemedText type="caption" style={{ color: theme.colors.muted }}>
        {empty}
      </ThemedText>
    </ThemedText>
  );
}

export function ReviewItem({ review, showVerifiedBadge }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold">{review.userName}</ThemedText>
        <Stars rating={review.rating} />
      </View>

      {showVerifiedBadge && review.verifiedPurchase ? (
        <View style={styles.badge}>
          <ThemedText type="caption" style={styles.badgeText}>
            Compra verificada
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="bodySmall" style={styles.text}>
        {review.text}
      </ThemedText>

      <ThemedText type="caption" style={styles.date}>
        {new Date(review.createdAtIso).toLocaleDateString()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.success,
  },
  badgeText: { color: "#000", fontWeight: "700" },
  text: { color: theme.colors.text, opacity: 0.9 },
  date: { color: theme.colors.muted },
});