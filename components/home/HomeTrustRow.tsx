import { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  onImpression?: () => void;
};

function HomeTrustRow({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.pillTitle}>Compra segura</Text>
        <Text style={styles.pillSub}>proteção do pedido</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillTitle}>Devolução fácil</Text>
        <Text style={styles.pillSub}>prazo de 7 dias</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillTitle}>Atendimento</Text>
        <Text style={styles.pillSub}>suporte rápido</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  pill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#262626",
  },
  pillTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  pillSub: {
    marginTop: 2,
    color: "#B8B8B8",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default memo(HomeTrustRow);
