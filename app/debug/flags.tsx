import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  FeatureFlagKey,
  FeatureFlags,
  getFeatureFlagDefault,
  setFeatureFlag,
} from "../../constants/featureFlags";
import { getFeatureFlags } from "../../utils/analytics";

type Row = {
  key: FeatureFlagKey;
  label: string;
  description: string;
};

export default function DebugFlagsScreen() {
  const [flags, setFlags] = useState<Partial<Record<FeatureFlagKey, boolean>>>({});

  const rows: Row[] = useMemo(
    () => [
      {
        key: FeatureFlags.ANALYTICS_EVENTS,
        label: "FF_ANALYTICS_EVENTS",
        description: "Habilita logs de eventos (console).",
      },
      {
        key: FeatureFlags.HOME_EVENTS_V1,
        label: "FF_HOME_EVENTS_V1",
        description: "Liga Etapa 1 da Home (view/click/fail).",
      },
      {
        key: FeatureFlags.HOME_EVENTS_V2,
        label: "FF_HOME_EVENTS_V2",
        description: "Liga Etapa 2 da Home (metas/props adicionais).",
      },
      {
        key: FeatureFlags.HOME_EVENTS_V3,
        label: "FF_HOME_EVENTS_V3",
        description: "Liga Etapa 4 da Home (search/category/restore).",
      },
      {
        key: FeatureFlags.HOME_SEARCH_DEBOUNCE_V1,
        label: "FF_HOME_SEARCH_DEBOUNCE_V1",
        description: "Debounce do search na Home (perf, invisível).",
      },
      {
        key: FeatureFlags.HOME_PERSIST_FILTERS_V1,
        label: "FF_HOME_PERSIST_FILTERS_V1",
        description: "Persistência do search/filtro da Home (invisível).",
      },
      {
        key: FeatureFlags.TTI_V1,
        label: "FF_TTI_V1",
        description: "Marca TTI (time-to-interactive) em telas principais.",
      },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const current = await getFeatureFlags();
        if (!mounted) return;
        // current vem como Record<string, boolean> por compat; normaliza para chaves esperadas
        const normalized: Partial<Record<FeatureFlagKey, boolean>> = {};
        rows.forEach((r) => {
          const v = (current as Record<string, boolean>)[r.key];
          if (typeof v === "boolean") normalized[r.key] = v;
        });
        setFlags(normalized);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [rows]);

  const onToggle = async (key: FeatureFlagKey, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
    try {
      await setFeatureFlag(key, value);
    } catch {
      // rollback silencioso
      setFlags((prev) => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Debug • Feature Flags</Text>

        {rows.map((r) => {
          const v = flags[r.key] ?? getFeatureFlagDefault(r.key);
          return (
            <View key={r.key} style={styles.row}>
              <View style={styles.left}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.desc}>{r.description}</Text>
              </View>
              <Switch value={v} onValueChange={(nv) => onToggle(r.key, nv)} />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0B" },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131313",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  left: { flex: 1, gap: 4 },
  label: { color: "#fff", fontWeight: "700" },
  desc: { color: "#9A9A9A", fontSize: 12 },
});
