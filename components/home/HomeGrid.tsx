import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  onImpression?: () => void;
};

export default function HomeGrid({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return <View style={styles.grid} />;
}

const styles = StyleSheet.create({
  grid: { minHeight: 120, borderRadius: 16, borderWidth: 1 },
});
