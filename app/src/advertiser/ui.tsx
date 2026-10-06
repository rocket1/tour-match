import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "../theme";
import type { AdCategory, Audience, Campaign, CampaignStatus, EndReason } from "../types";

export const CATEGORY_LABEL: Record<AdCategory, string> = {
  attractions: "Attractions",
  tours: "Tours & activities",
  food_drink: "Food & drink",
  transport: "Transport",
  accommodation: "Accommodation",
  events: "Events",
  shopping: "Shopping",
  services: "Travel services",
};

export const CATEGORY_ICON: Record<AdCategory, keyof typeof Ionicons.glyphMap> = {
  attractions: "ticket-outline",
  tours: "walk-outline",
  food_drink: "restaurant-outline",
  transport: "train-outline",
  accommodation: "bed-outline",
  events: "musical-notes-outline",
  shopping: "bag-handle-outline",
  services: "briefcase-outline",
};

const STATUS_STYLE: Record<CampaignStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Draft", bg: colors.surfaceAlt, fg: colors.textMuted },
  in_review: { label: "In review", bg: "#FFF8E1", fg: "#8A6100" },
  active: { label: "Live", bg: "#E8F5E9", fg: colors.success },
  paused: { label: "Paused", bg: "#ECEFF1", fg: "#455A64" },
  rejected: { label: "Rejected", bg: "#FFEBEE", fg: colors.brandDark },
  ended: { label: "Ended", bg: colors.surfaceAlt, fg: colors.textMuted },
};

export const END_REASON_LABEL: Record<EndReason, string> = {
  completed: "Completed",
  budget_spent: "Budget spent",
  stopped: "Stopped early",
};

export function StatusPill({ campaign }: { campaign: Pick<Campaign, "status" | "endReason"> }) {
  const s = STATUS_STYLE[campaign.status];
  const label = campaign.status === "ended" && campaign.endReason ? END_REASON_LABEL[campaign.endReason] : s.label;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

export const ctr = (c: Pick<Campaign, "clicks" | "impressions">) =>
  c.impressions ? `${((c.clicks / c.impressions) * 100).toFixed(1)}%` : "–";

/** Terms acceptance checkbox with a link to the full document. */
export function TermsCheckbox({
  audience,
  checked,
  onChange,
  error,
  label,
}: {
  audience: Audience;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  label: string;
}) {
  return (
    <View style={{ marginBottom: space(4) }}>
      <View style={styles.checkRow}>
        <Pressable
          onPress={() => onChange(!checked)}
          style={[styles.box, checked && styles.boxOn]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          hitSlop={8}
        >
          {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </Pressable>
        <Text style={[type.body, { flex: 1 }]}>
          I agree to the{" "}
          <Text style={styles.link} onPress={() => router.push({ pathname: "/legal/[audience]", params: { audience } })}>
            {label}
          </Text>
          .
        </Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "700" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: space(3) },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.text, borderColor: colors.text },
  link: { fontWeight: "600", textDecorationLine: "underline" },
  error: { fontSize: 12, color: colors.brandDark, marginTop: 4, marginLeft: 34 },
});
