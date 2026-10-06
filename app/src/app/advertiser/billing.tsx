import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCents, useRequireAdvertiser } from "../../advertiser/session";
import { CardSetupForm } from "../../components/CardSetupForm";
import { Button, Card, ScreenHeader } from "../../components/Form";
import { colors, radius, space, type } from "../../theme";
import type { Charge, SavedCard } from "../../types";

const CHARGE_STATUS: Record<Charge["status"], string> = {
  succeeded: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  not_billed: "Test (not billed)",
};

export default function Billing() {
  const { account, api, config } = useRequireAdvertiser();
  const [card, setCard] = useState<SavedCard | null>(null);
  const [charges, setCharges] = useState<Charge[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!account) return;
    try {
      const b = await api.billing();
      setCard(b.card);
      setCharges(b.charges);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [account, api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const showForm = config?.billingEnabled && config.stripePublishableKey && (!card || editing);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Billing" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Text style={type.display}>Billing</Text>

          <Text style={styles.section}>Payment method</Text>
          {!config && <ActivityIndicator />}
          {config && !config.billingEnabled && (
            <Card style={{ backgroundColor: "#E3F2FD", borderWidth: 0 }}>
              <Text style={[type.body, { color: "#0D47A1" }]}>
                Billing isn't configured on this server yet (no Stripe keys), so ads launch without charging. Once Stripe is set
                up, you'll add your card here.
              </Text>
            </Card>
          )}

          {card && !editing && (
            <Card>
              <View style={styles.cardRow}>
                <View style={styles.cardIcon}>
                  <Ionicons name="card" size={22} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.bodyStrong}>
                    {card.brand.toUpperCase()} •••• {card.last4}
                  </Text>
                  <Text style={type.caption}>
                    Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: space(3), marginTop: space(4) }}>
                <View style={{ flex: 1 }}>
                  <Button label="Replace card" variant="outline" onPress={() => setEditing(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Remove"
                    variant="outline"
                    onPress={async () => {
                      await api.removeCard();
                      setCard(null);
                      setNotice("Card removed.");
                    }}
                  />
                </View>
              </View>
            </Card>
          )}

          {showForm && (
            <Card>
              <CardSetupForm
                publishableKey={config!.stripePublishableKey!}
                createSetupIntent={api.createSetupIntent}
                onConfirmed={async (setupIntentId) => {
                  const { card } = await api.saveCard(setupIntentId);
                  setCard(card);
                  setEditing(false);
                  setNotice("Card saved.");
                }}
              />
              {editing && (
                <View style={{ marginTop: space(3) }}>
                  <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} />
                </View>
              )}
            </Card>
          )}
          {notice && <Text style={styles.notice}>{notice}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.section}>History</Text>
          {!charges && !error && <ActivityIndicator />}
          {charges?.length === 0 && <Text style={type.caption}>No charges yet.</Text>}
          {charges?.map((ch) => (
            <View key={ch.id} style={styles.charge}>
              <View style={{ flex: 1 }}>
                <Text style={type.body} numberOfLines={2}>
                  {ch.description}
                </Text>
                <Text style={type.caption}>
                  {new Date(ch.createdAt).toLocaleDateString()} · {CHARGE_STATUS[ch.status]}
                  {ch.refundedCents > 0 ? ` · ${formatCents(ch.refundedCents)} refunded` : ""}
                </Text>
              </View>
              <Text style={[type.bodyStrong, ch.status === "refunded" && styles.struck]}>
                {formatCents(ch.amountCents, ch.currency)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 560, alignSelf: "center" },
  section: { ...type.heading, marginTop: space(8), marginBottom: space(3) },
  cardRow: { flexDirection: "row", alignItems: "center", gap: space(4) },
  cardIcon: {
    width: 48,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { color: colors.success, fontWeight: "600", marginTop: space(3) },
  error: { color: colors.brandDark, marginTop: space(3) },
  charge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  struck: { textDecorationLine: "line-through", color: colors.textMuted },
});
