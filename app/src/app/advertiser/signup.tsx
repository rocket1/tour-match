import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdvertiser } from "../../advertiser/session";
import { TermsCheckbox } from "../../advertiser/ui";
import { ApiError } from "../../api";
import { Button, Field, ScreenHeader } from "../../components/Form";
import { TERMS } from "../../legal/terms";
import { colors, space, type } from "../../theme";

export default function AdvertiserSignup() {
  const { signUp, account, ready } = useAdvertiser();
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", website: "", password: "" });
  const [accept, setAccept] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && account) router.replace("/advertiser");
  }, [ready, account]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setIssues({});
    try {
      await signUp({
        ...form,
        website: form.website.trim() || null,
        termsVersion: TERMS.advertiser.version,
        acceptTerms: accept,
      });
      router.replace("/advertiser");
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
      <ScreenHeader title="Create advertiser account" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={type.display}>Start advertising</Text>
            <Text style={[type.caption, { fontSize: 15, marginTop: space(2), marginBottom: space(6) }]}>
              Create ads in minutes. You only pay for clicks, from a budget you control.
            </Text>
            <Field
              label="Company name"
              value={form.companyName}
              onChangeText={set("companyName")}
              error={issues.companyName}
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
              textContentType="username"
            />
            <Field
              label="Website (optional)"
              value={form.website}
              onChangeText={set("website")}
              error={issues.website}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="https://"
            />
            <Field
              label="Password"
              value={form.password}
              onChangeText={set("password")}
              error={issues.password}
              hint="At least 10 characters."
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TermsCheckbox
              audience="advertiser"
              label="Advertiser Terms"
              checked={accept}
              onChange={setAccept}
              error={issues.acceptTerms}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Create account" onPress={submit} loading={busy} />
            <Pressable onPress={() => router.replace("/advertiser/login")} style={styles.alt}>
              <Text style={type.body}>
                Already have an account? <Text style={styles.link}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 480, alignSelf: "center" },
  error: { color: colors.brandDark, marginBottom: space(3) },
  alt: { marginTop: space(5), alignSelf: "center" },
  link: { fontWeight: "600", textDecorationLine: "underline", color: colors.text },
});
