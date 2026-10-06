import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCents, useRequireAdvertiser } from "../../advertiser/session";
import { CATEGORY_ICON, CATEGORY_LABEL, ctr, END_REASON_LABEL, StatusPill } from "../../advertiser/ui";
import { Button, Segmented } from "../../components/Form";
import { colors, radius, space, type } from "../../theme";
import type { AdCategory, Campaign, SavedCard } from "../../types";

type Tab = "live" | "drafts" | "past";

const LIVE = new Set(["active", "paused", "in_review"]);
const PAST_GROUPS: { key: string; label: string; match: (c: Campaign) => boolean }[] = [
  { key: "completed", label: END_REASON_LABEL.completed, match: (c) => c.status === "ended" && c.endReason === "completed" },
  {
    key: "budget_spent",
    label: END_REASON_LABEL.budget_spent,
    match: (c) => c.status === "ended" && c.endReason === "budget_spent",
  },
  { key: "stopped", label: END_REASON_LABEL.stopped, match: (c) => c.status === "ended" && c.endReason === "stopped" },
  { key: "rejected", label: "Rejected", match: (c) => c.status === "rejected" },
];

export default function AdvertiserDashboard() {
  const { account, api, config, ready } = useRequireAdvertiser();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [card, setCard] = useState<SavedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [category, setCategory] = useState<AdCategory | "all">("all");

  const load = useCallback(async () => {
    if (!account) return;
    try {
      const [c, b] = await Promise.all([api.campaigns(), api.billing()]);
      setCampaigns(c.campaigns);
      setCard(b.card);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, account]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const groups = useMemo(() => {
    const list = campaigns ?? [];
    return {
      live: list.filter((c) => LIVE.has(c.status)),
      drafts: list.filter((c) => c.status === "draft"),
      past: list.filter((c) => c.status === "ended" || c.status === "rejected"),
    };
  }, [campaigns]);

  const pastCategories = useMemo(() => [...new Set(groups.past.map((c) => c.category))], [groups.past]);
  const pastFiltered = groups.past.filter((c) => category === "all" || c.category === category);

  const totals = useMemo(() => {
    const list = campaigns ?? [];
    return {
      live: list.filter((c) => c.status === "active").length,
      clicks: list.reduce((n, c) => n + c.clicks, 0),
      spent: list.reduce((n, c) => n + c.spentCents, 0),
    };
  }, [campaigns]);

  if (!ready || !account) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.iconBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={type.bodyStrong}>Ads Manager</Text>
          <Text style={type.caption}>{account.companyName}</Text>
        </View>
        <Pressable onPress={() => router.push("/advertiser/account")} style={styles.iconBtn} accessibilityLabel="Account">
          <Ionicons name="person-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.inner}>
          <View style={styles.stats}>
            <Stat label="Live ads" value={String(totals.live)} />
            <Stat label="Clicks" value={totals.clicks.toLocaleString()} />
            <Stat label="Spent" value={formatCents(totals.spent)} />
          </View>

          {config && !config.billingEnabled && (
            <Banner
              icon="flask-outline"
              tone="info"
              text="Test mode: billing isn't configured on this server, so ads launch without charging a card."
            />
          )}
          {config?.billingEnabled && !card && (
            <Banner
              icon="card-outline"
              tone="warn"
              text="Add a payment card to launch ads."
              action="Add card"
              onPress={() => router.push("/advertiser/billing")}
            />
          )}
          {card && (
            <Pressable style={styles.cardRow} onPress={() => router.push("/advertiser/billing")}>
              <Ionicons name="card-outline" size={18} color={colors.text} />
              <Text style={[type.body, { flex: 1 }]}>
                {card.brand.toUpperCase()} •••• {card.last4}
              </Text>
              <Text style={styles.link}>Billing</Text>
            </Pressable>
          )}

          <View style={{ marginVertical: space(5) }}>
            <Button label="Create an ad" icon="add" onPress={() => router.push("/advertiser/ads/new")} />
          </View>

          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "live", label: `Live (${groups.live.length})` },
              { value: "drafts", label: `Drafts (${groups.drafts.length})` },
              { value: "past", label: `Past (${groups.past.length})` },
            ]}
          />

          {error && <Text style={[styles.error, { marginTop: space(4) }]}>{error}</Text>}
          {!campaigns && !error && <ActivityIndicator style={{ marginTop: space(8) }} />}

          {campaigns && tab === "live" && (
            <List items={groups.live} empty="No running ads. Create one, or re-enable a past ad." />
          )}
          {campaigns && tab === "drafts" && <List items={groups.drafts} empty="No drafts." />}
          {campaigns && tab === "past" && (
            <>
              {pastCategories.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  <Chip label="All categories" on={category === "all"} onPress={() => setCategory("all")} />
                  {pastCategories.map((c) => (
                    <Chip
                      key={c}
                      label={CATEGORY_LABEL[c]}
                      icon={CATEGORY_ICON[c]}
                      on={category === c}
                      onPress={() => setCategory(c)}
                    />
                  ))}
                </ScrollView>
              )}
              {pastFiltered.length === 0 && (
                <Text style={styles.empty}>Ads that finish, are stopped, or are rejected show up here.</Text>
              )}
              {PAST_GROUPS.map((g) => {
                const items = pastFiltered.filter(g.match);
                if (!items.length) return null;
                return (
                  <View key={g.key}>
                    <Text style={styles.groupTitle}>
                      {g.label} · {items.length}
                    </Text>
                    {items.map((c) => (
                      <AdRow key={c.id} c={c} />
                    ))}
                  </View>
                );
              })}
            </>
          )}

          <View style={styles.footer}>
            <Pressable onPress={() => router.push({ pathname: "/support/[audience]", params: { audience: "advertiser" } })}>
              <Text style={styles.link}>Advertiser support</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: "/legal/[audience]", params: { audience: "advertiser" } })}>
              <Text style={styles.link}>Advertiser Terms</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function List({ items, empty }: { items: Campaign[]; empty: string }) {
  if (!items.length) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={{ marginTop: space(4) }}>
      {items.map((c) => (
        <AdRow key={c.id} c={c} />
      ))}
    </View>
  );
}

function AdRow({ c }: { c: Campaign }) {
  const action =
    c.status === "ended"
      ? "Re-enable"
      : c.status === "rejected"
        ? "Edit & resubmit"
        : c.status === "draft"
          ? "Finish & launch"
          : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/advertiser/ads/[id]", params: { id: c.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={CATEGORY_ICON[c.category]} size={20} color={colors.text} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
          <StatusPill campaign={c} />
          <Text style={type.caption}>{CATEGORY_LABEL[c.category]}</Text>
        </View>
        <Text style={type.bodyStrong} numberOfLines={2}>
          {c.headline}
        </Text>
        {c.status !== "draft" && (
          <Text style={type.caption}>
            {c.impressions.toLocaleString()} views · {c.clicks.toLocaleString()} clicks · {ctr(c)} CTR ·{" "}
            {formatCents(c.spentCents)} of {formatCents(c.budgetCents)}
          </Text>
        )}
        {c.destinations.length > 0 && (
          <Text style={type.caption} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} /> {c.destinations.map(titleCase).join(", ")}
          </Text>
        )}
        {action && <Text style={styles.rowAction}>{action} →</Text>}
      </View>
    </Pressable>
  );
}

const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title}>{value}</Text>
    </View>
  );
}

function Chip({
  label,
  on,
  onPress,
  icon,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      {icon && <Ionicons name={icon} size={14} color={on ? "#fff" : colors.text} />}
      <Text style={[styles.chipText, on && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

function Banner({
  icon,
  text,
  tone,
  action,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone: "info" | "warn";
  action?: string;
  onPress?: () => void;
}) {
  const bg = tone === "warn" ? "#FFF8E1" : "#E3F2FD";
  const fg = tone === "warn" ? "#8A6100" : "#0D47A1";
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={[type.body, { flex: 1, color: fg }]}>{text}</Text>
      {action && <Text style={[styles.link, { color: fg }]}>{action}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center" },
  stats: { flexDirection: "row", gap: space(3), marginBottom: space(4) },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space(4) },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    padding: space(4),
    borderRadius: radius.md,
    marginBottom: space(3),
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  error: { color: colors.brandDark },
  empty: { ...type.caption, fontSize: 15, textAlign: "center", marginTop: space(10) },
  chips: { gap: space(2), paddingVertical: space(4) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.text },
  groupTitle: { ...type.heading, fontSize: 16, marginTop: space(5), marginBottom: space(1) },
  row: {
    flexDirection: "row",
    gap: space(4),
    paddingVertical: space(4),
    paddingHorizontal: space(2),
    marginHorizontal: -space(2),
    borderRadius: radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAction: { fontSize: 14, fontWeight: "600", color: colors.brand, marginTop: 2 },
  link: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline", color: colors.text },
  footer: { flexDirection: "row", justifyContent: "center", gap: space(6), marginTop: space(12) },
});
