// components/ui/collapsible.tsx
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import theme from "../../constants/theme";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import Icon from "./icon-symbol";

type Props = PropsWithChildren<{ title: string }>;

export default function Collapsible({ children, title }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView style={styles.wrap}>
      <TouchableOpacity style={styles.heading} onPress={() => setIsOpen((v) => !v)} activeOpacity={0.85}>
        <View style={styles.iconWrap}>
          <Icon
            name="chevron-forward-outline"
            size={18}
            color={theme.colors.text}
            style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
          />
        </View>
        <ThemedText style={styles.title}>{title}</ThemedText>
      </TouchableOpacity>

      {isOpen ? <ThemedView style={styles.content}>{children}</ThemedView> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    padding: 12,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  content: {
    marginTop: 10,
  },
});
