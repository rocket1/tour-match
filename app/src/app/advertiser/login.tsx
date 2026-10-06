import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdvertiser } from "../../advertiser/session";
import { Button, Field, ScreenHeader } from "../../components/Form";
import { colors, space, type } from "../../theme";

export default function AdvertiserLogin() {
  const { signIn, account, ready } = useAdvertiser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && account) router.replace("/advertiser");
  }, [ready, account]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/advertiser");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Advertiser sign in" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={type.display}>Welcome back</Text>
            <Text style={[type.caption, { fontSize: 15, marginTop: space(2), marginBottom: space(6) }]}>
              Sign in to manage your ads and billing.
            </Text>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={submit}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
            <Pressable onPress={() => router.replace("/advertiser/signup")} style={styles.alt}>
              <Text style={type.body}>
                New to TourMatch ads? <Text style={styles.link}>Create an account</Text>
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: "/support/[audience]", params: { audience: "advertiser" } })}
              style={styles.alt}
            >
              <Text style={styles.link}>Can't sign in? Contact support</Text>
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
