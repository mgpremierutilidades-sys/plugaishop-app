import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "../themed-text";

type Props = {
  items: string[];
  selected: string;

  // ✅ ESLint: param em type signature deve ser prefixado com "_"
  onSelect: (_cat: string) => void;

  onImpression?: () => void;
};

export default function HomeQuickChips({ items, selected, onSelect, onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((cat) => {
        const active = cat === selected;
        return (
          <Pressable key={cat} onPress={() => onSelect(cat)} style={[styles.chip, active && styles.chipOn]}>
            <ThemedText style={[styles.text, active && styles.textOn]}>{cat}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, opacity: 0.9 },
  chipOn: { opacity: 1 },
  text: { fontSize: 12 },
  textOn: { fontWeight: "700" },
});
