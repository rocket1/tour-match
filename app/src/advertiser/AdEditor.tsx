import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api";
import { Button, Card, Field } from "../components/Form";
import { SponsoredCard } from "../components/SponsoredCard";
import { colors, radius, space, type } from "../theme";
import type { AdCategory, CampaignContent } from "../types";
import { CATEGORY_ICON, CATEGORY_LABEL } from "./ui";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as AdCategory[];
const INTEREST_SUGGESTIONS = [
  "history",
  "food",
  "art",
  "architecture",
  "nightlife",
  "family",
  "outdoors",
  "wine",
  "photography",
  "shopping",
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_AD: CampaignContent = {
  headline: "",
  body: "",
  imageUrl: null,
  url: "https://",
  ctaLabel: "Learn more",
  category: "attractions",
  destinations: [],
  interests: [],
  startDate: null,
  endDate: null,
};

interface Props {
  initial: CampaignContent;
  advertiser: string;
  submitLabel: string;
  note?: string;
  onSubmit: (c: CampaignContent) => Promise<void>;
}

/** Form + live preview for an ad's creative and targeting. */
export function AdEditor({ initial, advertiser, submitLabel, note, onSubmit }: Props) {
  const [ad, setAd] = useState(initial);
  const [destText, setDestText] = useState(initial.destinations.map(titleCase).join(", "));
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewImage = usePreviewImage(ad.imageUrl);

  const set = <K extends keyof CampaignContent>(k: K, v: CampaignContent[K]) => setAd((a) => ({ ...a, [k]: v }));
  const toggleInterest = (i: string) =>
    set("interests", ad.interests.includes(i) ? ad.interests.filter((x) => x !== i) : [...ad.interests, i]);

  const submit = async () => {
    const local: Record<string, string> = {};
    if (ad.startDate && !DATE_RE.test(ad.startDate)) local.startDate = "Use YYYY-MM-DD.";
    if (ad.endDate && !DATE_RE.test(ad.endDate)) local.endDate = "Use YYYY-MM-DD.";
    if (Object.keys(local).length) {
      setIssues(local);
      return;
    }
    setBusy(true);
    setError(null);
    setIssues({});
    try {
      await onSubmit({
        ...ad,
        destinations: destText
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      });
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setIssues(err.issues ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.section}>Preview</Text>
      <SponsoredCard
        preview
        ad={{
          campaignId: "preview",
          advertiser,
          headline: ad.headline || "Your headline",
          body: ad.body,
          imageUrl: previewImage,
          ctaLabel: ad.ctaLabel || "Learn more",
          clickPath: "",
        }}
      />

      <Text style={styles.section}>Creative</Text>
      <Field
        label={`Headline (${ad.headline.length}/80)`}
        value={ad.headline}
        onChangeText={(v) => set("headline", v.slice(0, 80))}
        error={issues.headline}
        placeholder="Skip the lines at the Colosseum"
      />
      <Field
        label={`Description (${ad.body.length}/200)`}
        value={ad.body}
        onChangeText={(v) => set("body", v.slice(0, 200))}
        error={issues.body}
        multiline
        placeholder="One or two sentences on why travellers should click."
      />
      <Field
        label="Button label"
        value={ad.ctaLabel}
        onChangeText={(v) => set("ctaLabel", v.slice(0, 30))}
        error={issues.ctaLabel}
      />
      <Field
        label="Landing page URL"
        value={ad.url}
        onChangeText={(v) => set("url", v.trim())}
        error={issues.url}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        hint="Must start with https://. Add your own tracking parameters."
      />
      <Field
        label="Image URL (optional)"
        value={ad.imageUrl ?? ""}
        onChangeText={(v) => set("imageUrl", v.trim() || null)}
        error={issues.imageUrl}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        hint="A square image of at least 400×400 works best."
      />

      <Text style={styles.section}>Category</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => set("category", c)} style={[styles.chip, ad.category === c && styles.chipOn]}>
            <Ionicons name={CATEGORY_ICON[c]} size={14} color={ad.category === c ? "#fff" : colors.text} />
            <Text style={[styles.chipText, ad.category === c && { color: "#fff" }]}>{CATEGORY_LABEL[c]}</Text>
          </Pressable>
        ))}
      </View>
      {issues.category && <Text style={styles.fieldError}>{issues.category}</Text>}

      <Text style={styles.section}>Targeting</Text>
      <Field
        label="Destinations"
        value={destText}
        onChangeText={setDestText}
        error={issues.destinations}
        placeholder="Rome, Florence, Venice"
        hint="Comma-separated cities. Leave empty to show in every destination."
      />
      <Text style={styles.label}>Interests (optional)</Text>
      <View style={styles.chips}>
        {INTEREST_SUGGESTIONS.map((i) => (
          <Pressable key={i} onPress={() => toggleInterest(i)} style={[styles.chip, ad.interests.includes(i) && styles.chipOn]}>
            <Text style={[styles.chipText, ad.interests.includes(i) && { color: "#fff" }]}>{i}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[type.caption, { marginTop: space(2) }]}>
        With interests selected, your ad only shows to searches that mention at least one of them.
      </Text>

      <Text style={styles.section}>Schedule</Text>
      <View style={{ flexDirection: "row", gap: space(3) }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Start date (optional)"
            value={ad.startDate ?? ""}
            onChangeText={(v) => set("startDate", v.trim() || null)}
            error={issues.startDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="End date (optional)"
            value={ad.endDate ?? ""}
            onChangeText={(v) => set("endDate", v.trim() || null)}
            error={issues.endDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
      </View>

      {note && (
        <Card style={{ marginBottom: space(4), backgroundColor: colors.surfaceAlt, borderWidth: 0 }}>
          <Text style={type.caption}>{note}</Text>
        </Card>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label={submitLabel} onPress={submit} loading={busy} variant="dark" />
    </View>
  );
}

/**
 * The image URL to show in the live preview: only once it looks complete, and only after
 * typing pauses. Handing expo-image a new (often half-typed) source on every keystroke
 * sends it into an update loop on web.
 */
function usePreviewImage(url: string | null): string | null {
  const [preview, setPreview] = useState(url && LOOKS_LIKE_IMAGE_URL.test(url) ? url : null);
  useEffect(() => {
    const t = setTimeout(() => setPreview(url && LOOKS_LIKE_IMAGE_URL.test(url) ? url : null), 600);
    return () => clearTimeout(t);
  }, [url]);
  return preview;
}

const LOOKS_LIKE_IMAGE_URL = /^https:\/\/[^\s/]+\.[^\s/]+\/\S+$/;

const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

const styles = StyleSheet.create({
  section: { ...type.heading, marginTop: space(6), marginBottom: space(3) },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: space(2) },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontSize: 13, color: colors.text },
  fieldError: { fontSize: 12, color: colors.brandDark, marginTop: 4 },
  error: { color: colors.brandDark, marginBottom: space(3) },
});
