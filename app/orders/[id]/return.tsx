import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme, { Radius, Spacing } from "../../../constants/theme";
import { track } from "../../../lib/analytics";
import type { Order, ReturnType } from "../../../utils/ordersStore";
import {
  addReturnAttachment,
  createReturnRequest,
  getOrderById,
} from "../../../utils/ordersStore";

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

async function copyToClipboard(text: string) {
  try {
    const mod = await import("expo-clipboard");
    if (mod?.setStringAsync) {
      await mod.setStringAsync(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const REASONS = [
  "Produto com defeito",
  "Produto diferente do anunciado",
  "Arrependimento",
  "Tamanho incorreto",
  "Outro",
];

export default function OrderReturnScreen() {
  const params = useLocalSearchParams();
  const orderId = safeString(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [type, setType] = useState<ReturnType>("Troca");
  const [reasonQuick, setReasonQuick] = useState<string>(REASONS[0]);
  const [reasonText, setReasonText] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    setLoading(true);
    try {
      const found = await getOrderById(orderId);
      setOrder(found);

      if (found?.returnRequest) {
        setType(found.returnRequest.type);
        setReasonQuick("Outro");
        setReasonText(found.returnRequest.reason);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
      try {
        track("order_return_view", { order_id: orderId || "unknown" });
      } catch {}
    }, [load, orderId]),
  );

  const finalReason = useMemo(() => {
    if (reasonQuick !== "Outro") return reasonQuick;
    return reasonText.trim() || "Outro";
  }, [reasonQuick, reasonText]);

  const hasReturnOpen = !!order?.returnRequest;

  const submit = async () => {
    if (!orderId) return;

    if (hasReturnOpen) {
      Alert.alert("Troca / Reembolso", "Já existe uma solicitação aberta.");
      return;
    }

    if (!finalReason.trim()) {
      Alert.alert("Troca / Reembolso", "Informe o motivo.");
      return;
    }

    setSubmitting(true);
    try {
      try {
        track("order_return_submit_attempt", {
          order_id: orderId,
          type,
          reason: finalReason,
        });
      } catch {}

      const updated = await createReturnRequest(orderId, type, finalReason);
      if (!updated) {
        try {
          track("order_return_submit_fail", { order_id: orderId });
        } catch {}
        Alert.alert("Erro", "Não foi possível abrir a solicitação.");
        return;
      }

      setOrder(updated);

      try {
        track("order_return_submit_success", {
          order_id: orderId,
          protocol: updated.returnRequest?.protocol ?? "unknown",
        });
      } catch {}

      Alert.alert(
        "Solicitação criada",
        `Protocolo: ${updated.returnRequest?.protocol}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyProtocol = async () => {
    const p = order?.returnRequest?.protocol;
    if (!p) return;

    const ok = await copyToClipboard(p);
    if (ok) {
      try {
        track("order_return_protocol_copied", { order_id: orderId });
      } catch {}
      Alert.alert("Copiado", "Protocolo copiado.");
    } else {
      Alert.alert("Copiar", `Copie manualmente: ${p}`);
    }
  };

  /**
   * MOCK DE ANEXO
   * Aqui NÃO usamos image-picker para não quebrar TS/bundler.
   * Apenas simulamos a existência de um anexo.
   * No futuro: trocar por upload real (Bling / S3 / Backend).
   */
  const addMockAttachment = async () => {
    if (!orderId || !order?.returnRequest) {
      Alert.alert("Anexos", "Abra a solicitação antes de anexar.");
      return;
    }

    setAttaching(true);
    try {
      const fakeUri = `mock://photo-${Date.now()}.jpg`;

      const updated = await addReturnAttachment(orderId, fakeUri);
      if (!updated) {
        Alert.alert("Erro", "Não foi possível anexar.");
        return;
      }

      setOrder(updated);

      try {
        track("order_return_attachment_added", {
          order_id: orderId,
          attachments_count: updated.returnRequest?.attachments?.length ?? 0,
        });
      } catch {}

      Alert.alert("Anexo adicionado", "Foto anexada (mock).");
    } finally {
      setAttaching(false);
    }
  };

  const attachmentsCount = order?.returnRequest?.attachments?.length ?? 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        {/* Topbar */}
        <View style={styles.topbar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>Troca / Reembolso</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>

            {loading ? (
              <ThemedText style={styles.secondary}>Carregando…</ThemedText>
            ) : order?.returnRequest ? (
              <ThemedView style={styles.infoBox}>
                <ThemedText style={styles.infoTitle}>
                  Solicitação aberta
                </ThemedText>

                <ThemedText style={styles.secondary}>
                  Tipo:{" "}
                  <ThemedText style={styles.bold}>
                    {order.returnRequest.type}
                  </ThemedText>
                </ThemedText>

                <ThemedText style={styles.secondary}>
                  Status:{" "}
                  <ThemedText style={styles.bold}>
                    {order.returnRequest.status}
                  </ThemedText>
                </ThemedText>

                <ThemedText style={styles.secondary}>
                  Protocolo:{" "}
                  <ThemedText style={styles.bold}>
                    {order.returnRequest.protocol}
                  </ThemedText>
                </ThemedText>

                <ThemedText style={styles.secondary}>
                  Anexos:{" "}
                  <ThemedText style={styles.bold}>{attachmentsCount}</ThemedText>
                </ThemedText>

                <View style={styles.actionRow}>
                  <Pressable onPress={copyProtocol} style={styles.outlineBtn}>
                    <ThemedText style={styles.outlineBtnText}>
                      Copiar protocolo
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={addMockAttachment}
                    style={styles.outlineBtn}
                    disabled={attaching}
                  >
                    <ThemedText style={styles.outlineBtnText}>
                      {attaching ? "..." : "Adicionar foto"}
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            ) : (
              <ThemedText style={styles.secondary}>
                Abra a solicitação para habilitar anexos.
              </ThemedText>
            )}

            <View style={styles.divider} />

            <ThemedText style={styles.sectionTitle}>Tipo</ThemedText>

            <View style={styles.row}>
              {(["Troca", "Reembolso"] as ReturnType[]).map((t) => {
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    disabled={hasReturnOpen}
                    style={[
                      styles.pill,
                      active ? styles.pillActive : styles.pillIdle,
                      hasReturnOpen ? { opacity: 0.6 } : null,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.pillText,
                        active ? styles.pillTextActive : styles.pillTextIdle,
                      ]}
                    >
                      {t}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText style={styles.sectionTitle}>Motivo</ThemedText>

            <View style={styles.rowWrap}>
              {REASONS.map((r) => {
                const active = reasonQuick === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReasonQuick(r)}
                    disabled={hasReturnOpen}
                    style={[
                      styles.reasonPill,
                      active ? styles.reasonActive : styles.reasonIdle,
                      hasReturnOpen ? { opacity: 0.6 } : null,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.reasonText,
                        active
                          ? styles.reasonTextActive
                          : styles.reasonTextIdle,
                      ]}
                    >
                      {r}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {reasonQuick === "Outro" && !hasReturnOpen && (
              <TextInput
                value={reasonText}
                onChangeText={setReasonText}
                placeholder="Descreva o motivo"
                placeholderTextColor="rgba(0,0,0,0.45)"
                style={styles.input}
                multiline
                textAlignVertical="top"
              />
            )}

            <Pressable
              onPress={submit}
              style={[
                styles.primaryBtn,
                (submitting || hasReturnOpen) ? { opacity: 0.6 } : null,
              ]}
              disabled={submitting || hasReturnOpen}
            >
              <ThemedText style={styles.primaryBtnText}>
                {hasReturnOpen
                  ? "Solicitação já aberta"
                  : submitting
                    ? "Abrindo..."
                    : "Abrir solicitação"}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <View style={{ height: 24 }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  topbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  backArrow: {
    fontFamily: "Arimo",
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  title: {
    fontFamily: "Arimo",
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },

  scroll: { gap: Spacing.md },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  cardTitle: {
    fontFamily: "Arimo",
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },

  divider: { height: 1, backgroundColor: theme.colors.divider },

  sectionTitle: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  secondary: {
    fontFamily: "OpenSans",
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
  },
  bold: { fontWeight: "700", color: theme.colors.text },

  row: { flexDirection: "row", gap: 10 },
  rowWrap: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  pillIdle: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  pillText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700" },
  pillTextIdle: { color: theme.colors.text },
  pillTextActive: { color: "#FFFFFF" },

  reasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  reasonIdle: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
  },
  reasonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  reasonText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700" },
  reasonTextIdle: { color: theme.colors.text },
  reasonTextActive: { color: "#FFFFFF" },

  input: {
    minHeight: 110,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "OpenSans",
    fontSize: 12,
    color: theme.colors.text,
  },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },

  primaryBtnText: {
    fontFamily: "OpenSans",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  infoBox: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
    gap: 6,
  },

  infoTitle: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },

  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },

  outlineBtnText: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  actionRow: { flexDirection: "row", gap: 10 },
});