// components/home/HomeCategoryRail.tsx
import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  selected: string;
  onSelect: (cat: string) => void;
};

const DEFAULT_CATEGORIES = ["all", "ofertas", "casa", "eletrônicos", "beleza", "moda", "pets"];

function labelFor(cat: string) {
  if (cat === "all") return "Tudo";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function HomeCategoryRailBase({ selected, onSelect }: Props) {
  const cats = useMemo(() => DEFAULT_CATEGORIES, []);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cats.map((cat) => {
          const on = String(selected) === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => onSelect(cat)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{labelFor(cat)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(HomeCategoryRailBase);

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#131313",
    borderWidth: 1,
    borderColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#1F1F1F", borderColor: "#2A2A2A" },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "700", opacity: 0.85 },
  chipTextOn: { opacity: 1 },
});
