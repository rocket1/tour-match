import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAdvertiser } from "../advertiser/session";
import { ApiError, submitAdInquiry, type AdInquiry } from "../api";
import { Button, Card, Field, ScreenHeader } from "../components/Form";
import { colors, radius, space, type } from "../theme";

const FORMATS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: "sparkles-outline",
    title: "Sponsored result",
    body: "A clearly labelled card in search results, shown when a traveller's request matches your targeting.",
  },
  {
    icon: "location-outline",
    title: "Destination targeting",
    body: "Reach people planning a trip to the cities you serve, at the moment they're choosing what to do.",
  },
  {
    icon: "pricetags-outline",
    title: "Interest targeting",
    body: 'Our AI understands requests like "wine and food, not too much walking". Target food, history, family, nightlife and more.',
  },
  {
    icon: "stats-chart-outline",
    title: "Transparent reporting",
    body: "Impressions and clicks per campaign. No tracking of individual travellers.",
  },
];

const EMPTY: AdInquiry = { company: "", contactName: "", email: "", website: "", markets: "", monthlyBudget: "", message: "" };

export default function Advertise() {
  const { account } = useAdvertiser();
  const [form, setForm] = useState<AdInquiry>(EMPTY);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof AdInquiry) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async () => {
    setSending(true);
    setError(null);
    setIssues({});
    try {
      await submitAdInquiry(form);
      setSent(true);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setIssues(err.issues ?? {});
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Advertise with TourMatch" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={styles.kicker}>For brands, attractions & travel services</Text>
            <Text style={type.display}>Be there when travellers decide what to do.</Text>
            <Text style={[type.body, styles.lede]}>
              TourMatch travellers describe their trip in their own words, so you can place your offer next to requests where it
              genuinely fits.
            </Text>

            <View style={styles.ctaRow}>
              {account ? (
                <View style={{ flex: 1 }}>
                  <Button label="Open Ads Manager" icon="stats-chart-outline" onPress={() => router.push("/advertiser")} />
                </View>
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <Button label="Create account" onPress={() => router.push("/advertiser/signup")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Sign in" variant="outline" onPress={() => router.push("/advertiser/login")} />
                  </View>
                </>
              )}
            </View>
            <Text style={[type.caption, { marginTop: space(3) }]}>
              Self-serve: create ads, set a budget, pay by card and launch. Pay only for clicks.
            </Text>

            <View style={styles.formats}>
              {FORMATS.map((f) => (
                <View key={f.title} style={styles.format}>
                  <View style={styles.formatIcon}>
                    <Ionicons name={f.icon} size={22} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.bodyStrong}>{f.title}</Text>
                    <Text style={[type.caption, { fontSize: 14, marginTop: 2, lineHeight: 20 }]}>{f.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Card style={{ marginTop: space(4) }}>
              <Text style={type.heading}>Our ad standards</Text>
              <Text style={[type.caption, { fontSize: 14, marginTop: space(2), lineHeight: 20 }]}>
                Every placement is labelled "Sponsored" and never changes the order of organic results. We review every campaign,
                and we don't accept ads that make licensing or safety claims we can't verify.
              </Text>
            </Card>

            <Text style={[type.title, { marginTop: space(10), marginBottom: space(1) }]}>Planning a larger campaign?</Text>
            <Text style={[type.caption, { fontSize: 14, marginBottom: space(5) }]}>
              Talk to our partnerships team about destination sponsorships and custom packages.
            </Text>

            {sent ? (
              <Card style={styles.sent}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                <Text style={[type.heading, { marginTop: space(2) }]}>Thanks. We've got your details.</Text>
                <Text style={[type.caption, { fontSize: 14, marginTop: space(1), textAlign: "center" }]}>
                  Our partnerships team will email {form.email}.
                </Text>
              </Card>
            ) : (
              <>
                <Field
                  label="Company"
                  value={form.company}
                  onChangeText={set("company")}
                  error={issues.company}
                  autoComplete="organization"
                />
                <Field
                  label="Your name"
                  value={form.contactName}
                  onChangeText={set("contactName")}
                  error={issues.contactName}
                  autoComplete="name"
                />
                <Field
                  label="Work email"
                  value={form.email}
                  onChangeText={set("email")}
                  error={issues.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Field
                  label="Website (optional)"
                  value={form.website}
                  onChangeText={set("website")}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Field
                  label="Cities or regions to target"
                  value={form.markets}
                  onChangeText={set("markets")}
                  placeholder="e.g. Rome, Florence, Amalfi Coast"
                />
                <Field
                  label="Monthly budget (optional)"
                  value={form.monthlyBudget}
                  onChangeText={set("monthlyBudget")}
                  placeholder="e.g. $2,000"
                />
                <Field label="Anything else? (optional)" value={form.message} onChangeText={set("message")} multiline />
                {error && <Text style={styles.formError}>{error}</Text>}
                <Button label="Send inquiry" onPress={submit} loading={sending} />
              </>
            )}

            <View style={styles.footer}>
              <Pressable onPress={() => router.push({ pathname: "/legal/[audience]", params: { audience: "advertiser" } })}>
                <Text style={styles.footLink}>Advertiser Terms</Text>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: "/support/[audience]", params: { audience: "advertiser" } })}>
                <Text style={styles.footLink}>Advertiser support</Text>
              </Pressable>
            </View>
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
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
    marginBottom: space(2),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lede: { marginTop: space(3), color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  formats: { marginTop: space(8), gap: space(5) },
  format: { flexDirection: "row", gap: space(4) },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "#FFF1F3",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaRow: { flexDirection: "row", gap: space(3), marginTop: space(6) },
  footer: { flexDirection: "row", justifyContent: "center", gap: space(6), marginTop: space(10) },
  footLink: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline", color: colors.text },
  formError: { color: colors.brandDark, marginBottom: space(3) },
  sent: { alignItems: "center", paddingVertical: space(8) },
});
