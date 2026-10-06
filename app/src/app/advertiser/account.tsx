import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequireAdvertiser } from "../../advertiser/session";
import { ApiError } from "../../api";
import { Button, Field, ScreenHeader } from "../../components/Form";
import { colors, radius, space, type } from "../../theme";

export default function AdvertiserAccountScreen() {
  const { account, api, signOut, refreshAccount, replaceToken } = useRequireAdvertiser();
  const [profile, setProfile] = useState({ companyName: "", contactName: "", website: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ profile?: string; password?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (account)
      setProfile({ companyName: account.companyName, contactName: account.contactName, website: account.website ?? "" });
  }, [account]);

  if (!account) return <ActivityIndicator style={{ flex: 1 }} />;

  const run = async (key: "profile" | "password", fn: () => Promise<string>) => {
    setBusy(key);
    setIssues({});
    setMsg({});
    try {
      setMsg({ [key]: await fn() });
    } catch (e) {
      const err = e as ApiError;
      setIssues(err.issues ?? {});
      setMsg({ [key]: err.message });
    } finally {
      setBusy(null);
    }
  };

  const LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; href: Href }[] = [
    { icon: "card-outline", label: "Billing & payment history", href: "/advertiser/billing" },
    {
      icon: "document-text-outline",
      label: "Advertiser Terms",
      href: { pathname: "/legal/[audience]", params: { audience: "advertiser" } },
    },
    {
      icon: "help-buoy-outline",
      label: "Advertiser support",
      href: { pathname: "/support/[audience]", params: { audience: "advertiser" } },
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Account" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={type.display}>{account.companyName}</Text>
            <Text style={[type.caption, { marginTop: space(1) }]}>
              {account.email} · Terms v{account.termsVersion} accepted {new Date(account.termsAcceptedAt).toLocaleDateString()}
            </Text>

            {LINKS.map((l) => (
              <Pressable key={l.label} style={styles.link} onPress={() => router.push(l.href)}>
                <Ionicons name={l.icon} size={20} color={colors.text} />
                <Text style={[type.body, { flex: 1 }]}>{l.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}

            <Text style={styles.section}>Business details</Text>
            <Field
              label="Company name"
              value={profile.companyName}
              onChangeText={(v) => setProfile({ ...profile, companyName: v })}
              error={issues.companyName}
            />
            <Field
              label="Contact name"
              value={profile.contactName}
              onChangeText={(v) => setProfile({ ...profile, contactName: v })}
              error={issues.contactName}
            />
            <Field
              label="Website"
              value={profile.website}
              onChangeText={(v) => setProfile({ ...profile, website: v })}
              error={issues.website}
              autoCapitalize="none"
              keyboardType="url"
            />
            {msg.profile && <Text style={styles.msg}>{msg.profile}</Text>}
            <Button
              label="Save details"
              variant="dark"
              loading={busy === "profile"}
              onPress={() =>
                run("profile", async () => {
                  await api.updateAccount({ ...profile, website: profile.website.trim() || null });
                  await refreshAccount();
                  return "Saved. New ads will show the updated company name.";
                })
              }
            />

            <Text style={styles.section}>Change password</Text>
            <Field
              label="Current password"
              value={pw.current}
              onChangeText={(v) => setPw({ ...pw, current: v })}
              error={issues.currentPassword}
              secureTextEntry
              autoComplete="current-password"
            />
            <Field
              label="New password"
              value={pw.next}
              onChangeText={(v) => setPw({ ...pw, next: v })}
              error={issues.newPassword}
              hint="At least 10 characters. Signs you out on other devices."
              secureTextEntry
              autoComplete="new-password"
            />
            {msg.password && <Text style={styles.msg}>{msg.password}</Text>}
            <Button
              label="Update password"
              variant="dark"
              loading={busy === "password"}
              disabled={!pw.current || !pw.next}
              onPress={() =>
                run("password", async () => {
                  const { token } = await api.changePassword(pw.current, pw.next);
                  await replaceToken(token);
                  setPw({ current: "", next: "" });
                  return "Password updated.";
                })
              }
            />

            <View style={{ marginTop: space(10) }}>
              <Button
                label="Sign out"
                variant="outline"
                icon="log-out-outline"
                onPress={async () => {
                  await signOut();
                  router.replace("/advertise");
                }}
              />
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
  inner: { width: "100%", maxWidth: 560, alignSelf: "center" },
  section: { ...type.heading, marginTop: space(8), marginBottom: space(3) },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: radius.sm,
  },
  msg: { color: colors.textMuted, marginBottom: space(3) },
});
