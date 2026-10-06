import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ApiError,
  fetchPartner,
  registerPartner,
  testPartnerEndpoint,
  updatePartnerEndpoint,
  type PartnerCredentials,
} from "../../api";
import { Button, Card, CopyButton, Field, ScreenHeader, Segmented } from "../../components/Form";
import { TermsCheckbox } from "../../advertiser/ui";
import { formatPrice } from "../../format";
import { TERMS } from "../../legal/terms";
import { colors, radius, space, type } from "../../theme";
import type { EndpointTestResult, PartnerAccount, Tour } from "../../types";

// Credentials live in memory only for this session. The secret is a signing key, so it
// isn't written to device storage.
export default function PartnerConsole() {
  const [creds, setCreds] = useState<PartnerCredentials | null>(null);
  const [account, setAccount] = useState<PartnerAccount | null>(null);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Partner console" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            {creds && account ? (
              <Dashboard
                creds={creds}
                account={account}
                freshSecret={freshSecret}
                onAccount={setAccount}
                onSignOut={() => {
                  setCreds(null);
                  setAccount(null);
                  setFreshSecret(null);
                }}
              />
            ) : (
              <Onboarding
                onReady={(c, a, secretToShow) => {
                  setCreds(c);
                  setAccount(a);
                  setFreshSecret(secretToShow);
                }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Onboarding({ onReady }: { onReady: (c: PartnerCredentials, a: PartnerAccount, secretToShow: string | null) => void }) {
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [form, setForm] = useState({ companyName: "", contactEmail: "", website: "", endpointUrl: "" });
  const [login, setLogin] = useState({ partnerId: "", secret: "" });
  const [accept, setAccept] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setIssues({});
    try {
      await fn();
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setIssues(err.issues ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={type.display}>Connect your inventory</Text>
      <Text style={[type.body, { color: colors.textMuted, marginTop: space(2), marginBottom: space(6) }]}>
        Register your endpoint to get a partner ID and signing secret, then send test requests until it passes.
      </Text>
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
          setIssues({});
        }}
        options={[
          { value: "register", label: "New partner" },
          { value: "signin", label: "I have credentials" },
        ]}
      />
      <View style={{ height: space(6) }} />

      {mode === "register" ? (
        <>
          <Field
            label="Company name"
            value={form.companyName}
            onChangeText={(v) => setForm({ ...form, companyName: v })}
            error={issues.companyName}
          />
          <Field
            label="Technical contact email"
            value={form.contactEmail}
            onChangeText={(v) => setForm({ ...form, contactEmail: v })}
            error={issues.contactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Website (optional)"
            value={form.website}
            onChangeText={(v) => setForm({ ...form, website: v })}
            error={issues.website}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field
            label="Search endpoint URL"
            value={form.endpointUrl}
            onChangeText={(v) => setForm({ ...form, endpointUrl: v })}
            error={issues.endpointUrl}
            placeholder="https://api.yourcompany.com/tourmatch/search"
            hint="Must be HTTPS and reachable from the internet. You can change it later."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TermsCheckbox
            audience="partner"
            label="Partner Terms"
            checked={accept}
            onChange={setAccept}
            error={issues.acceptTerms}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label="Register & get credentials"
            loading={busy}
            onPress={() =>
              run(async () => {
                const { partner, secret } = await registerPartner({
                  ...form,
                  website: form.website.trim() || null,
                  termsVersion: TERMS.partner.version,
                  acceptTerms: accept,
                });
                onReady({ partnerId: partner.id, secret }, partner, secret);
              })
            }
          />
        </>
      ) : (
        <>
          <Field
            label="Partner ID"
            value={login.partnerId}
            onChangeText={(v) => setLogin({ ...login, partnerId: v.trim() })}
            autoCapitalize="none"
            placeholder="p_…"
          />
          <Field
            label="Secret"
            value={login.secret}
            onChangeText={(v) => setLogin({ ...login, secret: v.trim() })}
            autoCapitalize="none"
            secureTextEntry
            placeholder="tmsk_…"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label="Open console"
            variant="dark"
            loading={busy}
            onPress={() =>
              run(async () => {
                const { partner } = await fetchPartner(login);
                onReady(login, partner, null);
              })
            }
          />
        </>
      )}
    </>
  );
}

const STATUS: Record<PartnerAccount["status"], { label: string; bg: string; fg: string; note: string }> = {
  pending: {
    label: "Pending review",
    bg: "#FFF8E1",
    fg: "#8A6100",
    note: "Get a passing test, then our team reviews your listing. Pending partners aren't shown to travellers yet.",
  },
  approved: { label: "Live", bg: "#E8F5E9", fg: colors.success, note: "Your tours are included in traveller searches." },
  suspended: {
    label: "Suspended",
    bg: "#FFEBEE",
    fg: colors.brandDark,
    note: "Your listing is paused. Contact partners support to resolve it.",
  },
};

function Dashboard({
  creds,
  account,
  freshSecret,
  onAccount,
  onSignOut,
}: {
  creds: PartnerCredentials;
  account: PartnerAccount;
  freshSecret: string | null;
  onAccount: (a: PartnerAccount) => void;
  onSignOut: () => void;
}) {
  const [endpoint, setEndpoint] = useState(account.endpointUrl);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<EndpointTestResult | null>(account.lastTest);
  const [sample, setSample] = useState<Tour[]>([]);
  const status = STATUS[account.status];

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { partner } = await updatePartnerEndpoint(creds, endpoint);
      onAccount(partner);
      setResult(null);
      setMessage("Endpoint saved. Run a test to confirm it works.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const r = await testPartnerEndpoint(creds);
      setResult(r.result);
      setSample(r.sampleTours);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <View style={styles.accountHead}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>{account.companyName}</Text>
          <Text style={type.caption}>{account.contactEmail}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={[type.caption, { fontSize: 14, marginTop: space(2) }]}>{status.note}</Text>

      {freshSecret && (
        <Card style={styles.secretCard}>
          <View style={styles.secretHead}>
            <Ionicons name="key" size={18} color="#8A6100" />
            <Text style={type.bodyStrong}>Save your credentials now</Text>
          </View>
          <Text style={[type.caption, { fontSize: 14, marginVertical: space(2) }]}>
            The secret signs every request we send you. It won't be shown again. Store it as{" "}
            <Text style={styles.mono}>TOURMATCH_SECRET</Text> on your server.
          </Text>
          <CredentialRow label="Partner ID" value={creds.partnerId} />
          <CredentialRow label="Secret" value={freshSecret} />
        </Card>
      )}

      <Text style={styles.section}>Endpoint</Text>
      <Field
        label="Search endpoint URL"
        value={endpoint}
        onChangeText={setEndpoint}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {endpoint !== account.endpointUrl && <Button label="Save endpoint" variant="dark" onPress={save} loading={saving} />}

      <Text style={styles.section}>Test console</Text>
      <Text style={[type.caption, { fontSize: 14, marginBottom: space(4) }]}>
        Sends a signed sample search (private, licensed, Rome, 4 guests, wheelchair access) to your endpoint and checks the
        response against the schema.
      </Text>
      <Button label="Send test request" icon="paper-plane-outline" onPress={test} loading={testing} />
      {message && <Text style={[styles.error, { marginTop: space(3) }]}>{message}</Text>}

      {result && (
        <Card style={{ marginTop: space(5) }}>
          <View style={styles.resultHead}>
            <Ionicons
              name={result.ok ? "checkmark-circle" : "close-circle"}
              size={24}
              color={result.ok ? colors.success : colors.brandDark}
            />
            <Text style={type.heading}>{result.ok ? "Test passed" : "Test failed"}</Text>
          </View>
          <View style={styles.metrics}>
            <Metric label="HTTP" value={result.httpStatus ? String(result.httpStatus) : "–"} />
            <Metric label="Latency" value={`${result.latencyMs} ms`} />
            <Metric label="Tours" value={String(result.tourCount)} />
          </View>
          {result.errors.map((e) => (
            <View key={e} style={styles.issue}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.brandDark} />
              <Text style={[styles.mono, { flex: 1 }]}>{e}</Text>
            </View>
          ))}
          {result.ok && result.tourCount === 0 && (
            <Text style={type.caption}>Valid response with no tours. That's fine if you have nothing in Rome.</Text>
          )}
          {sample.map((t) => (
            <View key={t.id} style={styles.sampleTour}>
              <Text style={type.bodyStrong}>{t.title}</Text>
              <Text style={type.caption}>
                {[t.city, formatPrice(t), t.licensedGuide ? "Licensed guide" : null].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ))}
          <Text style={[type.caption, { marginTop: space(3) }]}>Tested {new Date(result.at).toLocaleString()}</Text>
        </Card>
      )}

      <View style={{ marginTop: space(10) }}>
        <Button label="Sign out" variant="outline" onPress={onSignOut} />
      </View>
    </>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.credRow}>
      <View style={{ flex: 1 }}>
        <Text style={type.caption}>{label}</Text>
        <Text style={styles.mono} selectable>
          {value}
        </Text>
      </View>
      <CopyButton value={value} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.heading}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
  error: { color: colors.brandDark, marginBottom: space(3) },
  section: { ...type.heading, marginTop: space(8), marginBottom: space(3) },
  accountHead: { flexDirection: "row", alignItems: "center", gap: space(3) },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: "700" },
  secretCard: { marginTop: space(5), backgroundColor: "#FFFBEA", borderColor: "#F2D675" },
  secretHead: { flexDirection: "row", alignItems: "center", gap: space(2) },
  credRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F2D675",
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
    color: colors.text,
  },
  resultHead: { flexDirection: "row", alignItems: "center", gap: space(2) },
  metrics: { flexDirection: "row", gap: space(3), marginVertical: space(4) },
  metric: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: space(3) },
  issue: { flexDirection: "row", gap: space(2), marginBottom: space(2), alignItems: "flex-start" },
  sampleTour: { paddingVertical: space(3), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
