import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "../themed-text";

type Props = {
  onImpression?: () => void;
};

export default function HomeTrustRow({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <View style={styles.row}>
      <ThemedText style={styles.item}>Compra Garantida</ThemedText>
      <ThemedText style={styles.item}>Entrega Rápida</ThemedText>
      <ThemedText style={styles.item}>Devolução Fácil</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 8 },
  item: { fontSize: 12, opacity: 0.85 },
});
