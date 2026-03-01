import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { isFlagEnabled } from "../constants/flags";
import theme from "../constants/theme";
import { track } from "../lib/analytics";
import { setEntryGateSkipBiometric } from "../utils/entryGateStorage";

export default function EntryScreen() {
  const enabled = useMemo(
    () => isFlagEnabled("ff_entry_biometric_gate_v1"),
    [],
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      track("entry_gate_view", { enabled });
    } catch {}
  }, [enabled]);

  const proceed = () => router.replace("/(tabs)" as any);

  const allowWithoutBiometric = async () => {
    await setEntryGateSkipBiometric(true);
    try {
      track("entry_gate_skip_biometric", {});
    } catch {}
    proceed();
  };

  const authNow = async () => {
    if (!enabled) return proceed();

    setBusy(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !enrolled) {
        try {
          track("entry_gate_biometric_unavailable", { hasHardware, enrolled });
        } catch {}
        return proceed();
      }

      try {
        track("entry_gate_biometric_attempt", {});
      } catch {}

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirmar identidade",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });

      if (res.success) {
        try {
          track("entry_gate_biometric_success", {});
        } catch {}
        return proceed();
      }

      try {
        track("entry_gate_biometric_fail", {
          error: (res as any).error ?? "unknown",
        });
      } catch {}

      Alert.alert(
        "Falha na autenticação",
        "Você pode tentar novamente ou entrar sem biometria.",
      );
    } catch {
      Alert.alert("Erro", "Não foi possível validar biometria agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Entrar</ThemedText>
          <ThemedText style={styles.subtitle}>
            Use biometria para acessar o Plugaishop.
          </ThemedText>

          <Pressable
            onPress={authNow}
            disabled={busy}
            style={[styles.primaryBtn, busy ? { opacity: 0.6 } : null]}
          >
            <ThemedText style={styles.primaryText}>
              {busy ? "..." : "Entrar com biometria"}
            </ThemedText>
          </Pressable>

          <Pressable onPress={allowWithoutBiometric} style={styles.linkBtn}>
            <ThemedText style={styles.linkText}>Entrar sem biometria</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: 16, justifyContent: "center" },

  card: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 16,
    gap: 10,
  },

  title: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textMuted },

  primaryBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  linkBtn: { alignSelf: "center", paddingVertical: 10 },
  linkText: { fontSize: 12, fontWeight: "700", color: theme.colors.primary },
});