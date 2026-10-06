import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/Form";
import { AUDIENCE_LABEL, LEGAL_REVIEWED, TERMS } from "../../legal/terms";
import { colors, radius, space, type } from "../../theme";
import type { Audience } from "../../types";

const AUDIENCES = Object.keys(TERMS) as Audience[];

export default function TermsScreen() {
  const params = useLocalSearchParams<{ audience: string }>();
  const audience = (AUDIENCES.includes(params.audience as Audience) ? params.audience : "traveler") as Audience;
  const doc = TERMS[audience];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Terms of Service" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.tabs}>
            {AUDIENCES.map((a) => (
              <Pressable
                key={a}
                onPress={() => router.setParams({ audience: a })}
                style={[styles.tab, a === audience && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: a === audience }}
              >
                <Text style={[styles.tabText, a === audience && { color: colors.text }]}>{AUDIENCE_LABEL[a]}</Text>
              </Pressable>
            ))}
          </View>

          {!LEGAL_REVIEWED && (
            <View style={styles.draft}>
              <Ionicons name="alert-circle-outline" size={18} color="#8A6100" />
              <Text style={[type.caption, { flex: 1, color: "#8A6100" }]}>Template pending legal review. Not yet in force.</Text>
            </View>
          )}

          <Text style={type.display}>{doc.title}</Text>
          <Text style={[type.caption, { marginTop: space(2) }]}>Version {doc.version}</Text>

          <View style={styles.summary}>
            <Text style={type.bodyStrong}>In short</Text>
            <Text style={[type.body, { marginTop: space(1) }]}>{doc.summary}</Text>
          </View>

          {doc.sections.map((s, i) => (
            <View key={s.heading} style={{ marginTop: space(6) }}>
              <Text style={type.heading}>
                {i + 1}. {s.heading}
              </Text>
              {s.body.map((p) => (
                <Text key={p.slice(0, 40)} style={[type.body, styles.para]}>
                  {p}
                </Text>
              ))}
            </View>
          ))}

          <Pressable
            style={styles.support}
            onPress={() => router.push({ pathname: "/support/[audience]", params: { audience } })}
          >
            <Ionicons name="help-buoy-outline" size={20} color={colors.text} />
            <Text style={[type.bodyStrong, { flex: 1 }]}>Questions about these terms? Contact support</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 720, alignSelf: "center" },
  tabs: { flexDirection: "row", gap: space(2), marginBottom: space(6), flexWrap: "wrap" },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  tabOn: { borderColor: colors.text, borderWidth: 2, paddingHorizontal: 13, paddingVertical: 7 },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  draft: {
    flexDirection: "row",
    gap: space(2),
    alignItems: "center",
    backgroundColor: "#FFFBEA",
    borderRadius: radius.sm,
    padding: space(3),
    marginBottom: space(5),
  },
  summary: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space(4), marginTop: space(5) },
  para: { marginTop: space(2), color: "#3F3F3F" },
  support: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    marginTop: space(10),
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
});
