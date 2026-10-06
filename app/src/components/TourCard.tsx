import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration, formatPrice } from "../format";
import { colors, radius, space, type } from "../theme";
import type { RankedTour } from "../types";
import { HeartButton } from "./HeartButton";

export function TourCard({ tour, showReason = true }: { tour: RankedTour; showReason?: boolean }) {
  const price = formatPrice(tour);
  const meta = [tour.city, formatDuration(tour.durationMinutes), tour.isPrivate ? "Private" : null].filter(Boolean).join(" · ");

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push({ pathname: "/tour/[id]", params: { id: tour.id } })}
        style={({ pressed }) => pressed && { opacity: 0.92 }}
        accessibilityRole="button"
        accessibilityLabel={tour.title}
      >
        <View style={styles.imageWrap}>
          <Image
            source={tour.imageUrl ? { uri: tour.imageUrl } : undefined}
            style={styles.image}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          />
          <View style={styles.topRow}>
            <View style={styles.badges}>
              {tour.licensedGuide === true && (
                <View style={styles.badge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.text} />
                  <Text style={styles.badgeText}>Licensed guide</Text>
                </View>
              )}
              {tour.isDemo && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Sample</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={2}>
              {tour.title}
            </Text>
            {tour.rating != null && (
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color={colors.star} />
                <Text style={styles.ratingText}>
                  {tour.rating.toFixed(2)}
                  {tour.reviewCount > 0 && <Text style={type.caption}> ({tour.reviewCount.toLocaleString()})</Text>}
                </Text>
              </View>
            )}
          </View>
          {!!meta && <Text style={type.caption}>{meta}</Text>}
          <Text style={type.caption}>via {tour.providerName}</Text>
          {!!price && <Text style={[styles.price]}>{price}</Text>}
          {showReason && !!tour.matchReason && (
            <View style={styles.reason}>
              <Ionicons name="sparkles" size={13} color={colors.brand} />
              <Text style={styles.reasonText} numberOfLines={2}>
                {tour.matchReason}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      {/* Sibling, not child, of the card Pressable: nested buttons are invalid on web. */}
      <View style={styles.heart}>
        <HeartButton tour={tour} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space(8), flex: 1 },
  heart: { position: "absolute", top: space(3), right: space(3) },
  imageWrap: { borderRadius: radius.md, overflow: "hidden", aspectRatio: 1.05, backgroundColor: colors.surfaceAlt },
  image: { width: "100%", height: "100%" },
  topRow: {
    position: "absolute",
    top: space(3),
    left: space(3),
    right: space(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badges: { flexDirection: "row", gap: space(2), flexShrink: 1, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: colors.text },
  body: { paddingTop: space(3), gap: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space(3) },
  title: { ...type.bodyStrong, flex: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3, paddingTop: 2 },
  ratingText: { fontSize: 14, color: colors.text },
  price: { ...type.bodyStrong, marginTop: 4 },
  reason: {
    flexDirection: "row",
    gap: 6,
    marginTop: space(2),
    backgroundColor: "#FFF1F3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "flex-start",
  },
  reasonText: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 },
});
