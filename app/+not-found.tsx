// app/+not-found.tsx
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import theme from "../constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Ops… rota não encontrada</Text>
        <Text style={styles.subtitle}>
          Parece que esta tela não existe (ou foi movida).
        </Text>

        <Link href="/" style={styles.link}>
          Voltar para a Home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textStrong,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
    textAlign: "center",
    marginBottom: 18,
    maxWidth: 380,
  },
  link: {
    ...theme.typography.bodyStrong,
    color: theme.colors.primary,
  },
});
