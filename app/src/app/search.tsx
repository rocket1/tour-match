import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../store";
import { colors, radius, shadow, space, type } from "../theme";

const ADD_ONS = [
  "with a licensed guide",
  "private",
  "for 2 adults",
  "under $100 each",
  "this weekend",
  "kid-friendly",
  "in Spanish",
  "wheelchair accessible",
];

export default function SearchScreen() {
  const { draft } = useLocalSearchParams<{ draft?: string }>();
  const [text, setText] = useState(draft ?? "");
  const { recent, clearRecent } = useStore();

  const submit = (q = text) => {
    const prompt = q.trim();
    if (prompt.length < 2) return;
    router.replace({ pathname: "/results", params: { q: prompt } });
  };

  const appendChip = (chip: string) => setText((t) => (t.trim() ? `${t.trim()} ${chip}` : chip));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.close} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, shadow]}>
            <Text style={type.title}>What are you looking for?</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              placeholder="e.g. A private food tour in Lisbon for my parents, licensed guide, nothing too walk-heavy"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="search"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={() => submit()}
              maxLength={1000}
            />
            <View style={styles.chips}>
              {ADD_ONS.map((c) => (
                <Pressable key={c} onPress={() => appendChip(c)} style={styles.chip}>
                  <Ionicons name="add" size={14} color={colors.text} />
                  <Text style={styles.chipText}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {recent.length > 0 && (
            <View style={{ marginTop: space(6) }}>
              <View style={styles.recentHeader}>
                <Text style={type.heading}>Recent</Text>
                <Pressable onPress={clearRecent} hitSlop={8}>
                  <Text style={styles.link}>Clear</Text>
                </Pressable>
              </View>
              {recent.map((r) => (
                <Pressable key={r} onPress={() => submit(r)} style={styles.recentRow}>
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={() => setText("")} hitSlop={8}>
            <Text style={styles.link}>Clear all</Text>
          </Pressable>
          <Pressable
            onPress={() => submit()}
            disabled={text.trim().length < 2}
            style={({ pressed }) => [styles.searchBtn, (pressed || text.trim().length < 2) && { opacity: 0.6 }]}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.searchText}>Search</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  topBar: { paddingHorizontal: space(6), paddingTop: space(2) },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: space(4), paddingBottom: space(10) },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg + 8, padding: space(6) },
  input: {
    ...type.body,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 120,
    marginTop: space(4),
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlignVertical: "top",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2), marginTop: space(4) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, color: colors.text },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space(2),
    marginBottom: space(2),
  },
  recentRow: {
    flexDirection: "row",
    gap: space(3),
    alignItems: "center",
    paddingVertical: space(3),
    paddingHorizontal: space(2),
  },
  link: { fontSize: 15, fontWeight: "600", color: colors.text, textDecorationLine: "underline" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space(6),
    paddingVertical: space(4),
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    backgroundColor: colors.brand,
    paddingHorizontal: space(6),
    paddingVertical: 14,
    borderRadius: radius.sm,
  },
  searchText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
