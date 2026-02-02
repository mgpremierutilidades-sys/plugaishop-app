import { memo, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
  onImpression?: () => void;
};

function HomeQuickChips({ items, selected, onSelect, onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((it) => {
          const active = it === selected;
          return (
            <TouchableOpacity
              key={it}
              onPress={() => onSelect(it)}
              activeOpacity={0.85}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>{it}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
  },
  row: {
    paddingRight: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipIdle: {
    borderColor: "#2A2A2A",
    backgroundColor: "#121212",
  },
  chipActive: {
    borderColor: "#3A3A3A",
    backgroundColor: "#1E1E1E",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextIdle: {
    color: "#DADADA",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});

export default memo(HomeQuickChips);
