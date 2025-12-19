import { StyleSheet } from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";

export default function CartTab() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Carrinho</ThemedText>
      <ThemedText style={styles.subtitle}>Tela do carrinho (rota do Tab).</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  subtitle: { marginTop: 8, opacity: 0.8 },
});
