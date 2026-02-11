import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import theme from "../../constants/theme";
import type { OrderDraft } from "../../types/order";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { makePixCode, msLeft, pixExpiresAt } from "../../utils/pix";

function formatMMSS(ms: number) {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function PixScreen() {
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [left, setLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await loadOrderDraft();
      if (!d) return;

      // garante payment pix no draft
      const next = patchOrderDraft(d, { payment: { method: "pix", status: "pending" } });
      await saveOrderDraft(next);

      const exp = pixExpiresAt(2);
      setExpiresAt(exp);
      setDraft(next);
      setLeft(msLeft(exp));
    })();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setLeft(msLeft(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const code = useMemo(() => (draft?.id ? makePixCode(draft.id) : ""), [draft]);

  async function handleCopy() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleMarkPaid() {
    if (!draft) return;
    await saveOrderDraft(patchOrderDraft(draft, { payment: { method: "pix", status: "paid" } }));
    router.push("/checkout/review");
  }

  if (!draft) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16 }}>Carregando Pix...</Text>
      </View>
    );
  }

  const expired = left <= 0;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Pix</Text>

      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        Escaneie o QR Code ou copie o código Pix.
      </Text>

      <View
        style={{
          marginTop: 16,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
        }}
      >
        <QRCode value={code} size={220} />
        <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Expira em: {expired ? "00:00" : formatMMSS(left)}
        </Text>
      </View>

      <Pressable
        onPress={handleCopy}
        style={{
          marginTop: 16,
          backgroundColor: "#EEF1F5",
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.divider,
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "bold" }}>
          {copied ? "Código copiado" : "Copiar código Pix"}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleMarkPaid}
        disabled={expired}
        style={{
          marginTop: 10,
          backgroundColor: theme.colors.success,
          padding: 14,
          borderRadius: 12,
          opacity: expired ? 0.5 : 1,
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "bold", color: "#000" }}>
          Simular pagamento aprovado
        </Text>
      </Pressable>
    </View>
  );
}
