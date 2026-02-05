import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "../themed-text";

type Props = {
  onImpression?: () => void;
};

export default function HomeBannerStrip({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <View style={styles.box}>
      <ThemedText style={styles.title}>Ofertas do dia</ThemedText>
      <ThemedText style={styles.subtitle}>Frete grátis e descontos relâmpago</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, borderRadius: 16, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: "700" },
  subtitle: { fontSize: 12, opacity: 0.8, marginTop: 4 },
});
