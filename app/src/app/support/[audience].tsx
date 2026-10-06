import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdvertiser } from "../../advertiser/session";
import { ApiError, fetchSupportTopics, submitSupportRequest } from "../../api";
import { Button, Card, Field, ScreenHeader } from "../../components/Form";
import { AUDIENCE_LABEL } from "../../legal/terms";
import { colors, radius, space, type } from "../../theme";
import type { Audience } from "../../types";

const AUDIENCES: Audience[] = ["traveler", "advertiser", "partner"];

const COPY: Record<Audience, { intro: string; referenceLabel: string; referenceHint: string }> = {
  traveler: {
    intro:
      "Questions about search results, a listing, or your data. For an existing booking, contact the tour provider directly. They handle bookings and refunds.",
    referenceLabel: "Tour name or link (optional)",
    referenceHint: "Helps us find the listing you mean.",
  },
  advertiser: {
    intro: "Help with your advertiser account, billing and refunds, ad review, or campaign performance.",
    referenceLabel: "Ad ID (optional)",
    referenceHint: "Starts with c_. You'll find it on the ad's page.",
  },
  partner: {
    intro: "Help connecting your booking system, the test console, approval status, or your listings.",
    referenceLabel: "Partner ID (optional)",
    referenceHint: "Starts with p_. Never send your secret.",
  },
};

export default function SupportScreen() {
  const params = useLocalSearchParams<{ audience: string; reference?: string }>();
  const audience = (AUDIENCES.includes(params.audience as Audience) ? params.audience : "traveler") as Audience;
  const { account } = useAdvertiser();

  const [topics, setTopics] = useState<Record<Audience, string[]> | null>(null);
  const [form, setForm] = useState({ name: "", email: "", topic: "", reference: params.reference ?? "", message: "" });
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  useEffect(() => {
    fetchSupportTopics()
      .then(setTopics)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Prefill for signed-in advertisers.
  useEffect(() => {
    if (audience === "advertiser" && account) {
      setForm((f) => ({ ...f, name: f.name || account.contactName, email: f.email || account.email }));
    }
  }, [audience, account]);

  // Reset topic when switching audience, since each has its own list.
  useEffect(() => setForm((f) => ({ ...f, topic: "" })), [audience]);

  const copy = COPY[audience];
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setIssues({});
    try {
      const { ticketId } = await submitSupportRequest({ audience, ...form, reference: form.reference || undefined });
      setTicket(ticketId);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setIssues(err.issues ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Support" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={type.display}>How can we help?</Text>
            <Text style={[type.caption, { fontSize: 15, marginTop: space(2), marginBottom: space(5) }]}>
              I'm contacting support as…
            </Text>
            <View style={styles.audiences}>
              {AUDIENCES.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => {
                    setTicket(null);
                    router.setParams({ audience: a });
                  }}
                  style={[styles.audience, a === audience && styles.audienceOn]}
                >
                  <Ionicons
                    name={a === "traveler" ? "person-outline" : a === "advertiser" ? "megaphone-outline" : "business-outline"}
                    size={20}
                    color={a === audience ? colors.text : colors.textMuted}
                  />
                  <Text style={[styles.audienceText, a === audience && { color: colors.text }]}>{AUDIENCE_LABEL[a]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[type.body, { color: colors.textMuted, marginVertical: space(5) }]}>{copy.intro}</Text>

            {ticket ? (
              <Card style={styles.done}>
                <Ionicons name="checkmark-circle" size={36} color={colors.success} />
                <Text style={[type.heading, { marginTop: space(2) }]}>Request received</Text>
                <Text style={[type.body, { textAlign: "center", marginTop: space(1) }]}>
                  Your reference is <Text style={type.bodyStrong}>{ticket}</Text>. We'll reply to {form.email}, usually within one
                  business day.
                </Text>
                <View style={{ marginTop: space(5), alignSelf: "stretch" }}>
                  <Button
                    label="Send another request"
                    variant="outline"
                    onPress={() => {
                      setTicket(null);
                      setForm((f) => ({ ...f, topic: "", reference: "", message: "" }));
                    }}
                  />
                </View>
              </Card>
            ) : (
              <>
                <Text style={styles.label}>Topic</Text>
                <View style={styles.topics}>
                  {(topics?.[audience] ?? []).map((t) => (
                    <Pressable key={t} onPress={() => set("topic")(t)} style={[styles.topic, form.topic === t && styles.topicOn]}>
                      <Text style={[styles.topicText, form.topic === t && { color: "#fff" }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                {issues.topic && <Text style={styles.fieldError}>{issues.topic}</Text>}
                <View style={{ height: space(4) }} />
                <Field label="Your name" value={form.name} onChangeText={set("name")} error={issues.name} autoComplete="name" />
                <Field
                  label="Email"
                  value={form.email}
                  onChangeText={set("email")}
                  error={issues.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Field
                  label={copy.referenceLabel}
                  value={form.reference}
                  onChangeText={set("reference")}
                  hint={copy.referenceHint}
                  autoCapitalize="none"
                />
                <Field
                  label="How can we help?"
                  value={form.message}
                  onChangeText={set("message")}
                  error={issues.message}
                  multiline
                  placeholder="What happened, what you expected, and any steps to reproduce."
                />
                {error && <Text style={styles.error}>{error}</Text>}
                <Button label="Send request" onPress={submit} loading={busy} />
                <Pressable
                  onPress={() => router.push({ pathname: "/legal/[audience]", params: { audience } })}
                  style={{ marginTop: space(5), alignSelf: "center" }}
                >
                  <Text style={styles.link}>Read the {AUDIENCE_LABEL[audience].toLowerCase()} terms</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
  audiences: { flexDirection: "row", gap: space(2) },
  audience: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: space(3),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  audienceOn: { borderColor: colors.text, borderWidth: 2 },
  audienceText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: space(2) },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  topic: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  topicOn: { backgroundColor: colors.text, borderColor: colors.text },
  topicText: { fontSize: 13, color: colors.text },
  fieldError: { fontSize: 12, color: colors.brandDark, marginTop: 4 },
  error: { color: colors.brandDark, marginBottom: space(3) },
  done: { alignItems: "center", paddingVertical: space(8) },
  link: { fontSize: 14, fontWeight: "600", color: colors.text, textDecorationLine: "underline" },
});
