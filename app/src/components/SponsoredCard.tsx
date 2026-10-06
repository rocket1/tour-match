import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { sponsoredClickUrl } from "../api";
import { colors, radius, space, type } from "../theme";
import type { SponsoredPlacement } from "../types";

/** A clearly labelled paid placement. Clicks go through the server so they're counted. */
export function SponsoredCard({ ad, preview = false }: { ad: SponsoredPlacement; preview?: boolean }) {
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(sponsoredClickUrl(ad.clickPath))}
      disabled={preview}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      accessibilityRole="link"
      accessibilityLabel={`Sponsored by ${ad.advertiser}: ${ad.headline}`}
    >
      {ad.imageUrl ? (
        <Image source={{ uri: ad.imageUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="megaphone-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>Sponsored · {ad.advertiser}</Text>
        <Text style={type.bodyStrong} numberOfLines={2}>
          {ad.headline}
        </Text>
        {!!ad.body && (
          <Text style={type.caption} numberOfLines={2}>
            {ad.body}
          </Text>
        )}
        <Text style={styles.cta}>{ad.ctaLabel} →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: space(4),
    padding: space(4),
    marginBottom: space(8),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
  },
  image: { width: 84, height: 84, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  cta: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 4, textDecorationLine: "underline" },
});
