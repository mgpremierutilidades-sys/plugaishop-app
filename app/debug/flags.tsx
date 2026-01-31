import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { FeatureFlags, getFeatureFlag, setFeatureFlag } from "../../constants/featureFlags";

type FlagRow = {
  key: (typeof FeatureFlags)[keyof typeof FeatureFlags];
  label: string;
  description: string;
};

export default function FlagsDebug() {
  const rows: FlagRow[] = useMemo(
    () => [
      {
        key: FeatureFlags.ANALYTICS_EVENTS,
        label: "FF_ANALYTICS_EVENTS",
        description: "Liga a coleta de analytics (track/queue/console).",
      },
      {
        key: FeatureFlags.HOME_EVENTS_V1,
        label: "FF_HOME_EVENTS_V1",
        description: "Liga instrumentação da Home (view/click/fail).",
      },
      {
        key: FeatureFlags.TTI_V1,
        label: "FF_TTI_V1",
        description: "Liga time_to_interactive (TTI) no root.",
      },
    ],
    []
  );

  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(
        rows.map(async (r) => {
          const v = await getFeatureFlag(r.key);
          return [r.key, v] as const;
        })
      );

      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [rows]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (key: FlagRow["key"]) => {
      const current = Boolean(values[key]);
      const next = !current;

      // Atualiza UI otimisticamente
      setValues((v) => ({ ...v, [key]: next }));
      try {
        await setFeatureFlag(key, next);
      } catch {
        // rollback visual se persistência falhar
        setValues((v) => ({ ...v, [key]: current }));
      }
    },
    [values]
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Flags Debug</Text>
      <Text style={{ marginTop: 6, color: "#6B7280" }}>
        Alternar flags em runtime (AsyncStorage). Não altera o layout das abas.
      </Text>

      <Pressable
        onPress={() => void refresh()}
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          backgroundColor: "#EEF1F5",
          borderWidth: 1,
          borderColor: "#E6E8EC",
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "bold" }}>
          {loading ? "Carregando…" : "Recarregar"}
        </Text>
      </Pressable>

      <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {rows.map((r) => {
          const isOn = Boolean(values[r.key]);
          return (
            <Pressable
              key={r.key}
              onPress={() => void toggle(r.key)}
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E6E8EC",
                backgroundColor: "#FFFFFF",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "bold" }}>{r.label}</Text>
                <View
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: isOn ? "#DCFCE7" : "#FEE2E2",
                    borderWidth: 1,
                    borderColor: isOn ? "#86EFAC" : "#FCA5A5",
                  }}
                >
                  <Text style={{ fontWeight: "bold", fontSize: 12 }}>{isOn ? "ON" : "OFF"}</Text>
                </View>
              </View>

              <Text style={{ marginTop: 6, color: "#6B7280" }}>{r.description}</Text>
              <Text style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF" }}>
                Toque para alternar
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
