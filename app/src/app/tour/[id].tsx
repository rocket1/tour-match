import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCachedTour } from "../../api";
import { HeartButton } from "../../components/HeartButton";
import { formatDuration, formatPrice } from "../../format";
import { useStore } from "../../store";
import { colors, radius, shadow, space, type } from "../../theme";

export default function TourDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { saved } = useStore();
  const insets = useSafeAreaInsets();
  const tour = getCachedTour(id) ?? saved.find((t) => t.id === id);

  if (!tour) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={type.heading}>This tour isn't loaded anymore</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: space(4) }}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const price = formatPrice(tour);
  const facts = [
    formatDuration(tour.durationMinutes) && { icon: "time-outline" as const, label: formatDuration(tour.durationMinutes)! },
    tour.isPrivate != null && {
      icon: "people-outline" as const,
      label: tour.isPrivate ? "Private: just your group" : "Group tour",
    },
    tour.languages.length > 0 && {
      icon: "language-outline" as const,
      label: `Offered in ${tour.languages.map((l) => l.toUpperCase()).join(", ")}`,
    },
    tour.isFree && { icon: "cash-outline" as const, label: "Free to join. Tip what you think it's worth." },
  ].filter(Boolean) as { icon: keyof typeof Ionicons.glyphMap; label: string }[];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Image
          source={tour.imageUrl ? { uri: tour.imageUrl } : undefined}
          style={styles.hero}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.content}>
          <Text style={type.title}>{tour.title}</Text>
          <View style={styles.metaRow}>
            {tour.rating != null && (
              <>
                <Ionicons name="star" size={14} color={colors.star} />
                <Text style={type.bodyStrong}>{tour.rating.toFixed(2)}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={[type.bodyStrong, { textDecorationLine: "underline" }]}>
                  {tour.reviewCount.toLocaleString()} reviews
                </Text>
                <Text style={styles.dot}>·</Text>
              </>
            )}
            <Text style={type.caption}>{tour.city}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.hostRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(tour.guideName ?? tour.providerName)[0]}</Text>
              {tour.licensedGuide === true && (
                <View style={styles.avatarBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.bodyStrong}>
                {tour.guideName ? `Hosted by ${tour.guideName}` : `Listed on ${tour.providerName}`}
              </Text>
              <Text style={type.caption}>
                {tour.licensedGuide === true
                  ? "Licensed guide"
                  : tour.licensedGuide === false
                    ? "Local guide (not licensed)"
                    : "License status: check on provider"}
                {" · "}via {tour.providerName}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {!!tour.matchReason && (
            <View style={styles.match}>
              <View style={styles.matchHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brand} />
                <Text style={type.bodyStrong}>Why it's a match</Text>
                <View style={styles.score}>
                  <Text style={styles.scoreText}>{tour.matchScore}% fit</Text>
                </View>
              </View>
              <Text style={[type.body, { marginTop: space(2) }]}>{tour.matchReason}</Text>
            </View>
          )}

          {facts.map((f) => (
            <View key={f.label} style={styles.fact}>
              <Ionicons name={f.icon} size={24} color={colors.text} />
              <Text style={[type.body, { flex: 1 }]}>{f.label}</Text>
            </View>
          ))}

          {!!tour.description && (
            <>
              <View style={styles.divider} />
              <Text style={[type.heading, { marginBottom: space(3) }]}>About this tour</Text>
              <Text style={type.body}>{tour.description}</Text>
            </>
          )}

          {tour.tags.length > 0 && (
            <View style={styles.tags}>
              {tour.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t.replace(/_/g, " ").toLowerCase()}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />
          <Text style={type.caption}>
            {tour.isDemo
              ? "This is a sample listing for demonstration. Connect a provider API key on the server to see real tours."
              : `Booking, payment and cancellation are handled by ${tour.providerName}.`}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.floating, { top: insets.top + space(2) }]}>
        <Pressable onPress={() => router.back()} style={[styles.circle, shadow]} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={[styles.circle, shadow]}>
          <HeartButton tour={tour} size={20} onDark={false} />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(3) }]}>
        <View style={{ flex: 1 }}>
          {price && <Text style={type.bodyStrong}>{price}</Text>}
          <Text style={type.caption}>{tour.isFree ? "per person" : "per person · on " + tour.providerName}</Text>
        </View>
        <Pressable
          disabled={tour.isDemo}
          onPress={() => WebBrowser.openBrowserAsync(tour.bookingUrl)}
          style={({ pressed }) => [styles.book, (pressed || tour.isDemo) && { opacity: 0.6 }]}
        >
          <Text style={styles.bookText}>{tour.isDemo ? "Sample only" : "Check availability"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { width: "100%", height: 320, backgroundColor: colors.surfaceAlt },
  content: {
    padding: space(6),
    marginTop: -space(5),
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: space(2), flexWrap: "wrap" },
  dot: { color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space(6) },
  hostRow: { flexDirection: "row", alignItems: "center", gap: space(4) },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "600" },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  match: { backgroundColor: "#FFF1F3", borderRadius: radius.md, padding: space(4), marginBottom: space(5) },
  matchHeader: { flexDirection: "row", alignItems: "center", gap: space(2) },
  score: { marginLeft: "auto", backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  scoreText: { fontSize: 12, fontWeight: "700", color: colors.brandDark },
  fact: { flexDirection: "row", alignItems: "center", gap: space(4), paddingVertical: space(3) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space(2), marginTop: space(4) },
  tag: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 13, color: colors.text },
  floating: { position: "absolute", left: space(5), right: space(5), flexDirection: "row", justifyContent: "space-between" },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space(6),
    paddingTop: space(4),
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  book: { backgroundColor: colors.brand, paddingHorizontal: space(6), paddingVertical: 14, borderRadius: radius.sm },
  bookText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { fontSize: 15, fontWeight: "600", color: colors.text, textDecorationLine: "underline" },
});
