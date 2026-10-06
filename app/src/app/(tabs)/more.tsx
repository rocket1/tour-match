import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL, fetchProviders } from "../../api";
import { BusinessLinks, HelpLinks } from "../../components/BusinessLinks";
import { colors, radius, space, type } from "../../theme";
import type { ProviderStatus } from "../../types";

const MODE_LABEL: Record<ProviderStatus["mode"], string> = {
  api: "Live search",
  link: "Opens their site",
  demo: "Sample data",
};

export default function More() {
  const [data, setData] = useState<{ aiEnabled: boolean; providers: ProviderStatus[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchProviders()
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.display}>More</Text>
        <Text style={[type.heading, { marginTop: space(6) }]}>Sources</Text>
        <Text style={[type.caption, { fontSize: 15, marginTop: space(2) }]}>
          Where TourMatch looks for tours. Live sources are searched and ranked together; the rest open pre-filled searches.
        </Text>

        {error && (
          <View style={styles.error}>
            <Ionicons name="warning-outline" size={18} color={colors.brandDark} />
            <Text style={[type.body, { flex: 1 }]}>
              Can't reach the server at {API_URL}. {error}
            </Text>
          </View>
        )}

        {data && (
          <>
            <Row
              title="Claude AI"
              subtitle="Understands your request and ranks results"
              right={data.aiEnabled ? "On" : "Off"}
              ok={data.aiEnabled}
            />
            {data.providers.map((p) => (
              <Row
                key={p.providerId}
                title={p.providerName}
                subtitle={MODE_LABEL[p.mode]}
                right={p.enabled ? "Connected" : "Needs API key"}
                ok={p.enabled}
              />
            ))}
          </>
        )}

        <View style={{ marginTop: space(10) }}>
          <BusinessLinks />
        </View>

        <View style={{ marginTop: space(10) }}>
          <HelpLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ title, subtitle, right, ok }: { title: string; subtitle: string; right: string; ok: boolean }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={type.bodyStrong}>{title}</Text>
        <Text style={type.caption}>{subtitle}</Text>
      </View>
      <View style={[styles.pill, ok ? styles.pillOk : styles.pillOff]}>
        <Text style={[styles.pillText, { color: ok ? colors.success : colors.textMuted }]}>{right}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(12) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillOk: { backgroundColor: "#E8F5E9" },
  pillOff: { backgroundColor: colors.surfaceAlt },
  pillText: { fontSize: 12, fontWeight: "600" },
  error: {
    flexDirection: "row",
    gap: space(2),
    marginTop: space(5),
    padding: space(4),
    borderRadius: radius.md,
    backgroundColor: "#FFF1F3",
  },
});
