import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL, partnerSpecUrl } from "../../api";
import { Button, Card, CodeBlock, ScreenHeader, Segmented } from "../../components/Form";
import { CURL_SAMPLE, NODE_SAMPLE, PYTHON_SAMPLE } from "../../partnerDocs";
import { colors, radius, space, type } from "../../theme";

interface JsonSchemaProp {
  type?: string | string[];
  description?: string;
  anyOf?: { type?: string }[];
}
interface Spec {
  version: string;
  headers: Record<string, string>;
  transport: { timeoutMs: number; maxTours: number };
  requestExample: unknown;
  responseExample: unknown;
  rules: string[];
  jsonSchema: {
    response: {
      properties: { tours: { items: { properties: Record<string, JsonSchemaProp>; required?: string[] } } };
    };
  };
}

const STEPS = [
  {
    icon: "chatbubble-ellipses-outline",
    title: "A traveller asks",
    body: '"Private Vatican tour, licensed guide, 4 of us, one uses a wheelchair."',
  },
  {
    icon: "git-network-outline",
    title: "We send you a structured request",
    body: "Destination, dates, group size, budget, style, languages and accessibility, signed with your secret.",
  },
  {
    icon: "list-outline",
    title: "You reply with matching tours",
    body: "Query your own inventory or booking API and return tours in our JSON format.",
  },
  {
    icon: "trophy-outline",
    title: "We rank and send them to you",
    body: "Your tours are ranked alongside other sources. Bookings happen on your site via your bookingUrl.",
  },
] as const;

type Lang = "node" | "python" | "curl";

function typeLabel(p: JsonSchemaProp): string {
  if (p.type) return Array.isArray(p.type) ? p.type.join(" | ") : p.type;
  if (p.anyOf) return p.anyOf.map((a) => a.type ?? "?").join(" | ");
  return "any";
}

export default function PartnerToolkit() {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("node");

  useEffect(() => {
    fetch(partnerSpecUrl())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSpec)
      .catch(() => setSpecError(`Couldn't load the live spec from ${API_URL}.`));
  }, []);

  const tourSchema = spec?.jsonSchema.response.properties.tours.items;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Partner toolkit" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <Text style={styles.kicker}>For tour companies & guides</Text>
          <Text style={type.display}>Plug your tours into TourMatch.</Text>
          <Text style={[type.body, styles.lede]}>
            Build one small endpoint and your inventory appears in AI-matched search results. Travellers book directly with you,
            so you keep the customer and the booking.
          </Text>

          <View style={styles.ctaRow}>
            <View style={{ flex: 1 }}>
              <Button label="Get credentials" icon="key-outline" onPress={() => router.push("/partners/console")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="View spec"
                variant="outline"
                icon="document-text-outline"
                onPress={() => WebBrowser.openBrowserAsync(partnerSpecUrl())}
              />
            </View>
          </View>

          <Text style={styles.section}>How it works</Text>
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.bodyStrong}>{s.title}</Text>
                <Text style={[type.caption, { fontSize: 14, lineHeight: 20, marginTop: 2 }]}>{s.body}</Text>
              </View>
            </View>
          ))}

          {!spec && !specError && <ActivityIndicator style={{ marginTop: space(8) }} />}
          {specError && (
            <Card style={{ marginTop: space(8) }}>
              <Text style={type.body}>{specError}</Text>
            </Card>
          )}

          {spec && (
            <>
              <Text style={styles.section}>1. What you receive</Text>
              <Text style={styles.para}>
                A <Text style={styles.inlineCode}>POST</Text> to your HTTPS endpoint with these headers. Respond within{" "}
                {spec.transport.timeoutMs / 1000}s. We skip slow endpoints for that search rather than make travellers wait.
              </Text>
              <Card style={{ padding: 0, marginBottom: space(4) }}>
                {Object.entries(spec.headers).map(([name, desc], i) => (
                  <View key={name} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <Text style={styles.inlineCode}>{name}</Text>
                    <Text style={[type.caption, { marginTop: 4 }]}>{desc}</Text>
                  </View>
                ))}
              </Card>
              <CodeBlock title="Request body" code={JSON.stringify(spec.requestExample, null, 2)} />

              <Text style={styles.section}>2. What you return</Text>
              <Text style={styles.para}>
                <Text style={styles.inlineCode}>{"{ tours: [...] }"}</Text> with up to {spec.transport.maxTours} tours. An empty
                list is fine when nothing fits.
              </Text>
              {tourSchema && (
                <Card style={{ padding: 0, marginBottom: space(4) }}>
                  {Object.entries(tourSchema.properties).map(([name, prop], i) => {
                    const required = tourSchema.required?.includes(name);
                    return (
                      <View key={name} style={[styles.row, i > 0 && styles.rowBorder]}>
                        <View style={styles.fieldHead}>
                          <Text style={styles.inlineCode}>{name}</Text>
                          <Text style={type.caption}>{typeLabel(prop)}</Text>
                          {required && <Text style={styles.required}>required</Text>}
                        </View>
                        {!!prop.description && <Text style={[type.caption, { marginTop: 4 }]}>{prop.description}</Text>}
                      </View>
                    );
                  })}
                </Card>
              )}
              <CodeBlock title="Response body" code={JSON.stringify(spec.responseExample, null, 2)} />

              <Text style={styles.section}>3. Verify the signature</Text>
              <Text style={styles.para}>
                Every request is signed with HMAC-SHA256 over <Text style={styles.inlineCode}>{"timestamp.rawBody"}</Text> using
                your secret. Reject anything unsigned or older than 5 minutes.
              </Text>
              <Segmented<Lang>
                value={lang}
                onChange={setLang}
                options={[
                  { value: "node", label: "Node.js" },
                  { value: "python", label: "Python" },
                  { value: "curl", label: "curl" },
                ]}
              />
              <View style={{ height: space(3) }} />
              <CodeBlock
                title={lang === "node" ? "server.js" : lang === "python" ? "app.py" : "test.sh"}
                code={lang === "node" ? NODE_SAMPLE : lang === "python" ? PYTHON_SAMPLE : CURL_SAMPLE}
              />

              <Text style={styles.section}>Partner rules</Text>
              {spec.rules.map((r) => (
                <View key={r} style={styles.rule}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={[type.body, { flex: 1 }]}>{r}</Text>
                </View>
              ))}

              <Card style={{ marginTop: space(8), backgroundColor: colors.surfaceAlt, borderWidth: 0 }}>
                <Text style={type.heading}>Machine-readable spec</Text>
                <Text style={[type.caption, { fontSize: 14, marginTop: space(1), marginBottom: space(4) }]}>
                  JSON Schema for request and response (protocol version {spec.version}). Generate types or validate in CI.
                </Text>
                <Button
                  label="Open spec JSON"
                  variant="outline"
                  icon="document-text-outline"
                  onPress={() => WebBrowser.openBrowserAsync(partnerSpecUrl())}
                />
              </Card>
            </>
          )}

          <View style={{ marginTop: space(8) }}>
            <Button label="Register your endpoint" onPress={() => router.push("/partners/console")} />
          </View>
          <View style={styles.footer}>
            <Text
              style={styles.footLink}
              onPress={() => router.push({ pathname: "/legal/[audience]", params: { audience: "partner" } })}
            >
              Partner Terms
            </Text>
            <Text
              style={styles.footLink}
              onPress={() => router.push({ pathname: "/support/[audience]", params: { audience: "partner" } })}
            >
              Partner support
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 720, alignSelf: "center" },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
    marginBottom: space(2),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lede: { marginTop: space(3), color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  ctaRow: { flexDirection: "row", gap: space(3), marginTop: space(6) },
  section: { ...type.title, marginTop: space(10), marginBottom: space(3) },
  para: { ...type.body, color: colors.textMuted, marginBottom: space(4) },
  step: { flexDirection: "row", gap: space(4), marginBottom: space(5) },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#fff", fontWeight: "700" },
  row: { paddingHorizontal: space(4), paddingVertical: space(3) },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  fieldHead: { flexDirection: "row", alignItems: "center", gap: space(2), flexWrap: "wrap" },
  inlineCode: {
    fontFamily: "Menlo",
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
  },
  required: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandDark,
    backgroundColor: "#FFF1F3",
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  footer: { flexDirection: "row", justifyContent: "center", gap: space(6), marginTop: space(8) },
  footLink: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline", color: colors.text },
  rule: { flexDirection: "row", gap: space(3), marginBottom: space(3) },
});
