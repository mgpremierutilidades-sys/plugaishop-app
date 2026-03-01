import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import theme from "../../constants/theme";
import type { Review } from "../../types/review";
import { track } from "../../lib/analytics";
import { ThemedText } from "../themed-text";
import { ReviewItem } from "./review-item";

type Sort = "recent" | "rating";

type Props = {
  reviews: Review[];
  enableVerifiedFilter: boolean;
  enableVerifiedBadge: boolean;
};

export function ReviewList({ reviews, enableVerifiedFilter, enableVerifiedBadge }: Props) {
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");

  const lastRenderKey = useRef<string>("");

  useEffect(() => {
    track("reviews.section_view");
  }, []);

  const filtered = useMemo(() => {
    let list = reviews.slice();

    if (enableVerifiedFilter && onlyVerified) {
      list = list.filter((r) => r.verifiedPurchase);
    }

    if (sort === "recent") {
      list.sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
    } else {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return list;
  }, [reviews, enableVerifiedFilter, onlyVerified, sort]);

  useEffect(() => {
    const key = `${filtered.length}|${sort}|${onlyVerified}|${enableVerifiedFilter}|${enableVerifiedBadge}`;
    if (lastRenderKey.current === key) return;
    lastRenderKey.current = key;

    track("reviews.list_render", {
      count: filtered.length,
      sort,
      onlyVerified,
      enableVerifiedFilter,
      enableVerifiedBadge,
    });
  }, [filtered.length, sort, onlyVerified, enableVerifiedFilter, enableVerifiedBadge]);

  function toggleVerified() {
    const next = !onlyVerified;
    setOnlyVerified(next);
    track("reviews.filter_verified_toggle", { enabled: next });
  }

  function cycleSort() {
    const next: Sort = sort === "recent" ? "rating" : "recent";
    setSort(next);
    track("reviews.sort_change", { sort: next });
  }

  function onCardClick(r: Review, index: number) {
    track("reviews.card_click", {
      id: r.id,
      productId: r.productId,
      verifiedPurchase: r.verifiedPurchase,
      position: index,
      sort,
      onlyVerified,
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <ThemedText type="sectionTitle">Avaliações</ThemedText>

        <Pressable onPress={cycleSort} style={styles.pill} accessibilityRole="button">
          <ThemedText type="caption" style={styles.pillText}>
            Ordenar: {sort === "recent" ? "Recentes" : "Nota"}
          </ThemedText>
        </Pressable>
      </View>

      {enableVerifiedFilter ? (
        <Pressable onPress={toggleVerified} style={styles.toggle} accessibilityRole="button">
          <View style={[styles.dot, onlyVerified ? styles.dotOn : null]} />
          <ThemedText type="caption" style={{ color: theme.colors.text }}>
            Somente compra verificada
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.list}>
        {filtered.map((r, idx) => (
          <Pressable
            key={r.id}
            onPress={() => onCardClick(r, idx)}
            accessibilityRole="button"
          >
            <ReviewItem review={r} showVerifiedBadge={enableVerifiedBadge} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => track("reviews.write_attempt")}
        style={styles.writeBtn}
        accessibilityRole="button"
      >
        <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
          Escrever avaliação (mock)
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: theme.colors.text },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  dotOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  list: { gap: 10 },
  writeBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});