import React from "react";
import { StyleSheet } from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";

export default function ProfileTab() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Perfil</ThemedText>
      <ThemedText style={styles.subtitle}>Tela de perfil (rota do Tab).</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  subtitle: { marginTop: 8, opacity: 0.8 },
});
