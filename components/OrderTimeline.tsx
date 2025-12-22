import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import theme, { Radius, Spacing } from "../constants/theme";

export type TimelineStep = {
  title: string;
  subtitle?: string;
  dateLabel?: string;
  done?: boolean;
  active?: boolean;
};

type Props = {
  steps: TimelineStep[];
};

export default function OrderTimeline({ steps }: Props) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.cardTitle}>Andamento do pedido</ThemedText>

      <View style={styles.list}>
        {steps.map((s, idx) => {
          const isLast = idx === steps.length - 1;
          const dotStyle = [
            styles.dot,
            s.done ? styles.dotDone : null,
            s.active ? styles.dotActive : null,
          ];

          return (
            <View key={`${s.title}-${idx}`} style={styles.row}>
              <View style={styles.rail}>
                <View style={dotStyle} />
                {!isLast ? <View style={styles.line} /> : null}
              </View>

              <View style={styles.content}>
                <View style={styles.headerLine}>
                  <ThemedText style={styles.title}>{s.title}</ThemedText>
                  {s.dateLabel ? (
                    <ThemedText style={styles.date}>{s.dateLabel}</ThemedText>
                  ) : null}
                </View>

                {s.subtitle ? (
                  <ThemedText style={styles.subtitle}>{s.subtitle}</ThemedText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    fontFamily: "Arimo",
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  list: { gap: Spacing.lg },

  row: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },

  rail: { width: 22, alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dotDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  dotActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  line: {
    marginTop: 8,
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.divider,
    borderRadius: 2,
  },

  content: { flex: 1, gap: 6 },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  title: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  date: {
    fontFamily: "OpenSans",
    fontSize: 12,
    color: theme.colors.muted,
  },
  subtitle: {
    fontFamily: "OpenSans",
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 16,
  },
});
