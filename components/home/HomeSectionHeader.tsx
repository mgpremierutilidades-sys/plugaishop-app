import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "../themed-text";

type Props = {
  title: string;
  subtitle?: string;
  onImpression?: () => void;
};

export default function HomeSectionHeader({ title, subtitle, onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 12, opacity: 0.75 },
});
