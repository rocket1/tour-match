import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCents, useRequireAdvertiser, type AdvertiserApi } from "../../../../advertiser/session";
import { CATEGORY_LABEL, ctr, StatusPill } from "../../../../advertiser/ui";
import { Button, Card, Field, ScreenHeader } from "../../../../components/Form";
import { SponsoredCard } from "../../../../components/SponsoredCard";
import { colors, radius, space, type } from "../../../../theme";
import type { AdvertiserConfig, Campaign, SavedCard } from "../../../../types";

export default function AdDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, api, config } = useRequireAdvertiser();
  const [c, setC] = useState<Campaign | null>(null);
  const [card, setCard] = useState<SavedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!account) return;
    try {
      const [r, b] = await Promise.all([api.campaign(id), api.billing()]);
      setC(r.campaign);
      setCard(b.card);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [account, api, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (name: string, fn: () => Promise<{ campaign: Campaign } | void>, message?: string) => {
    setBusy(name);
    setError(null);
    setNotice(null);
    try {
      const r = await fn();
      if (r) setC(r.campaign);
      if (message) setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!c || !account || !config) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader title="Ad" />
        {error ? (
          <Text style={[styles.error, { padding: space(6) }]}>{error}</Text>
        ) : (
          <ActivityIndicator style={{ marginTop: space(10) }} />
        )}
      </SafeAreaView>
    );
  }

  const remaining = c.budgetCents - c.spentCents;
  const canLaunch = c.status === "draft" || c.status === "rejected" || c.status === "ended";
  const canEdit = c.status !== "in_review";
  const running = c.status === "active" || c.status === "paused" || c.status === "in_review";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Ad details" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <View style={styles.titleRow}>
              <StatusPill campaign={c} />
              <Text style={type.caption}>
                {CATEGORY_LABEL[c.category]} · {c.id}
              </Text>
            </View>
            <Text style={[type.title, { marginTop: space(2), marginBottom: space(5) }]}>{c.headline}</Text>

            <SponsoredCard
              preview
              ad={{
                campaignId: c.id,
                advertiser: c.advertiser,
                headline: c.headline,
                body: c.body,
                imageUrl: c.imageUrl,
                ctaLabel: c.ctaLabel,
                clickPath: "",
              }}
            />

            {c.status === "rejected" && (
              <Card style={styles.rejected}>
                <View style={styles.inline}>
                  <Ionicons name="close-circle" size={18} color={colors.brandDark} />
                  <Text style={type.bodyStrong}>Not approved</Text>
                </View>
                <Text style={[type.body, { marginTop: space(1) }]}>{c.rejectionReason}</Text>
                <Text style={[type.caption, { marginTop: space(2) }]}>
                  Unspent budget was refunded to your card. Edit the ad and resubmit.
                </Text>
              </Card>
            )}
            {c.status === "in_review" && (
              <Card style={styles.review}>
                <Text style={type.body}>
                  We're reviewing this ad, usually within one business day. It goes live automatically once approved.
                </Text>
              </Card>
            )}

            {notice && <Text style={styles.notice}>{notice}</Text>}
            {error && <Text style={styles.error}>{error}</Text>}

            {c.status !== "draft" && (
              <>
                <Text style={styles.section}>Performance</Text>
                <View style={styles.stats}>
                  <Stat label="Impressions" value={c.impressions.toLocaleString()} />
                  <Stat label="Clicks" value={c.clicks.toLocaleString()} />
                  <Stat label="CTR" value={ctr(c)} />
                </View>
                <View style={styles.budget}>
                  <View style={styles.inline}>
                    <Text style={[type.bodyStrong, { flex: 1 }]}>
                      {formatCents(c.spentCents)} spent of {formatCents(c.budgetCents)}
                    </Text>
                    <Text style={type.caption}>{formatCents(Math.max(0, remaining))} left</Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${c.budgetCents ? Math.min(100, (c.spentCents / c.budgetCents) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                </View>
              </>
            )}

            <Text style={styles.section}>Targeting & schedule</Text>
            <Detail
              icon="location-outline"
              label="Destinations"
              value={c.destinations.length ? c.destinations.map(titleCase).join(", ") : "All destinations"}
            />
            <Detail icon="pricetags-outline" label="Interests" value={c.interests.length ? c.interests.join(", ") : "Any"} />
            <Detail
              icon="calendar-outline"
              label="Runs"
              value={`${c.startDate ?? "On approval"} → ${c.endDate ?? "Until budget is spent"}`}
            />
            <Detail icon="link-outline" label="Landing page" value={c.url} />

            {canLaunch && (
              <LaunchPanel
                campaign={c}
                card={card}
                config={config}
                api={api}
                onLaunched={(updated) => {
                  setC(updated);
                  setNotice(
                    updated.status === "active"
                      ? "Your ad is live."
                      : "Submitted for review. It goes live automatically once approved.",
                  );
                }}
              />
            )}

            <Text style={styles.section}>Manage</Text>
            <View style={{ gap: space(3) }}>
              {c.status === "active" && (
                <Button
                  label="Pause ad"
                  icon="pause"
                  variant="outline"
                  loading={busy === "pause"}
                  onPress={() => act("pause", () => api.pause(c.id), "Paused. Resume any time.")}
                />
              )}
              {c.status === "paused" && (
                <Button
                  label="Resume ad"
                  icon="play"
                  variant="dark"
                  loading={busy === "resume"}
                  onPress={() => act("resume", () => api.resume(c.id), "Your ad is live again.")}
                />
              )}
              {canEdit && (
                <Button
                  label="Edit ad"
                  icon="create-outline"
                  variant="outline"
                  onPress={() => router.push({ pathname: "/advertiser/ads/[id]/edit", params: { id: c.id } })}
                />
              )}
              <Button
                label="Duplicate"
                icon="copy-outline"
                variant="outline"
                loading={busy === "dup"}
                onPress={() =>
                  act("dup", async () => {
                    const { campaign } = await api.duplicate(c.id);
                    router.push({ pathname: "/advertiser/ads/[id]", params: { id: campaign.id } });
                  })
                }
              />
              {running && (
                <ConfirmButton
                  label="End ad"
                  confirmLabel={`End now & refund ${formatCents(Math.max(0, remaining))}`}
                  loading={busy === "stop"}
                  onConfirm={() =>
                    act("stop", async () => {
                      const r = await api.stop(c.id);
                      setNotice(`Ad ended. ${formatCents(r.refundedCents)} is being refunded to your card.`);
                      return r;
                    })
                  }
                />
              )}
              {c.status === "draft" && (
                <ConfirmButton
                  label="Delete draft"
                  confirmLabel="Delete permanently"
                  loading={busy === "delete"}
                  onConfirm={() =>
                    act("delete", async () => {
                      await api.deleteCampaign(c.id);
                      router.back();
                    })
                  }
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Budget + end date + payment, used to submit a draft, resubmit, or re-enable a past ad. */
function LaunchPanel({
  campaign: c,
  card,
  config,
  api,
  onLaunched,
}: {
  campaign: Campaign;
  card: SavedCard | null;
  config: AdvertiserConfig;
  api: AdvertiserApi;
  onLaunched: (c: Campaign) => void;
}) {
  const remaining = Math.max(0, c.budgetCents - c.spentCents);
  const needed = Math.max(0, config.minBudgetCents - remaining);
  const [dollars, setDollars] = useState(String(Math.max(50, Math.ceil(needed / 100))));
  const [endDate, setEndDate] = useState(c.endDate && c.endDate >= today() ? c.endDate : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const addCents = Math.round((parseFloat(dollars) || 0) * 100);
  const total = remaining + addCents;
  const needsCard = config.billingEnabled && !card && addCents > 0;
  const verb = c.status === "ended" ? "Re-enable" : c.status === "rejected" ? "Resubmit" : "Launch";
  const approvedBefore = Boolean(c.approvedContentHash);

  const submit = async () => {
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return setError("End date must be YYYY-MM-DD.");
    setBusy(true);
    setError(null);
    try {
      const { campaign } = await api.launch(c.id, addCents, endDate || null);
      onLaunched(campaign);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.launch}>
      <Text style={type.heading}>{verb} this ad</Text>
      <Text style={[type.caption, { marginTop: space(1), marginBottom: space(4) }]}>
        You pay {formatCents(config.cpcCents)} per click from a prepaid budget. Minimum budget{" "}
        {formatCents(config.minBudgetCents)}.
      </Text>
      {remaining > 0 && (
        <Text style={[type.body, { marginBottom: space(3) }]}>{formatCents(remaining)} of unspent budget carries over.</Text>
      )}
      <Field
        label={remaining > 0 ? "Add budget (USD)" : "Budget (USD)"}
        value={dollars}
        onChangeText={(v) => setDollars(v.replace(/[^0-9.]/g, ""))}
        keyboardType="decimal-pad"
        hint={`≈ ${Math.floor(total / config.cpcCents).toLocaleString()} clicks`}
      />
      <Field
        label="End date (optional)"
        value={endDate}
        onChangeText={setEndDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />

      <View style={styles.payRow}>
        <Ionicons name="card-outline" size={18} color={colors.text} />
        {config.billingEnabled ? (
          card ? (
            <Text style={[type.body, { flex: 1 }]}>
              {card.brand.toUpperCase()} •••• {card.last4}
            </Text>
          ) : (
            <Text style={[type.body, { flex: 1, color: colors.brandDark }]}>No card on file</Text>
          )
        ) : (
          <Text style={[type.body, { flex: 1 }]}>Test mode, no charge</Text>
        )}
        <Pressable onPress={() => router.push("/advertiser/billing")}>
          <Text style={styles.link}>{card ? "Change" : "Add card"}</Text>
        </Pressable>
      </View>

      <Text style={[type.caption, { marginBottom: space(4) }]}>
        {addCents > 0
          ? config.billingEnabled
            ? `${formatCents(addCents)} is charged to your card now. `
            : `Test mode: ${formatCents(addCents)} is added without charging a card. `
          : ""}
        {approvedBefore
          ? "This creative was approved before, so it goes live right away."
          : "Your ad goes live after review, usually within one business day."}{" "}
        Unspent budget is refunded if it's rejected or you end it early.
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        label={addCents > 0 && config.billingEnabled ? `Pay ${formatCents(addCents)} & ${verb.toLowerCase()}` : verb}
        onPress={submit}
        loading={busy}
        disabled={needsCard || total < config.minBudgetCents}
      />
    </Card>
  );
}

/** Two-step destructive button. Avoids native alerts, which don't work on web. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  loading,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <Button label={label} variant="outline" icon="stop-circle-outline" onPress={() => setArmed(true)} />;
  return (
    <View style={{ flexDirection: "row", gap: space(2) }}>
      <View style={{ flex: 2 }}>
        <Button label={confirmLabel} onPress={onConfirm} loading={loading} />
      </View>
      <View style={{ flex: 1 }}>
        <Button label="Cancel" variant="outline" onPress={() => setArmed(false)} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title}>{value}</Text>
    </View>
  );
}

function Detail({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={type.caption}>{label}</Text>
        <Text style={type.body}>{value}</Text>
      </View>
    </View>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  inline: { flexDirection: "row", alignItems: "center", gap: space(2) },
  section: { ...type.heading, marginTop: space(8), marginBottom: space(3) },
  rejected: { borderColor: "#F5C2C7", backgroundColor: "#FFF5F5", marginBottom: space(3) },
  review: { borderColor: "#F2D675", backgroundColor: "#FFFBEA", marginBottom: space(3) },
  notice: { color: colors.success, fontWeight: "600", marginVertical: space(2) },
  error: { color: colors.brandDark, marginVertical: space(2) },
  stats: { flexDirection: "row", gap: space(3) },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space(4) },
  budget: { marginTop: space(4) },
  track: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, marginTop: space(2), overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.brand, borderRadius: 4 },
  detail: { flexDirection: "row", gap: space(3), paddingVertical: space(2) },
  launch: { marginTop: space(8), borderColor: colors.text, borderWidth: 1.5 },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    padding: space(3),
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    marginBottom: space(3),
  },
  link: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline", color: colors.text },
});
