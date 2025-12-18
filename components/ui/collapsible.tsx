import { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Colors } from "../constants/theme";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import IconSymbol from "./icon-symbol";

type Props = PropsWithChildren<{
  title: string;
  style?: ViewStyle;
}>;

export default function Collapsible({ children, title, style }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="menu"
          size={18}
          color={Colors.icon}
          style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
        />
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>

      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  content: {
    paddingLeft: 24,
    paddingBottom: 12,
  },
});
