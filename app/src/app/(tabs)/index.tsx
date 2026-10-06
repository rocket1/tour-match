import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BusinessLinks } from "../../components/BusinessLinks";
import { SearchPill } from "../../components/SearchPill";
import { useStore } from "../../store";
import { colors, radius, space, type } from "../../theme";

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=70&auto=format&fit=crop`;

const CATEGORIES: { label: string; icon: keyof typeof Ionicons.glyphMap; draft: string }[] = [
  { label: "Licensed", icon: "shield-checkmark-outline", draft: "A licensed guide for " },
  { label: "Private", icon: "person-outline", draft: "A private tour in " },
  { label: "Food", icon: "restaurant-outline", draft: "A food tour in " },
  { label: "History", icon: "library-outline", draft: "A history tour with an expert guide in " },
  { label: "Free walks", icon: "walk-outline", draft: "A free walking tour in " },
  { label: "Family", icon: "happy-outline", draft: "A kid-friendly tour in " },
  { label: "Nightlife", icon: "moon-outline", draft: "A nightlife tour in " },
];

const IDEAS = [
  "Private Vatican tour with a licensed guide for 4 adults, one uses a wheelchair",
  "Tokyo street food at night, small group, under $150",
  "Free walking tour in Lisbon this weekend in Spanish",
  "Day trip to Teotihuacan from Mexico City with an archaeologist",
];

const DESTINATIONS = [
  { city: "Rome", image: img("1552832230-c0197dd311b5") },
  { city: "Tokyo", image: img("1540959733332-eab4deabeeaf") },
  { city: "Lisbon", image: img("1555881400-74d7acaacd8b") },
  { city: "Paris", image: img("1502602898657-3e91760cbb34") },
  { city: "Mexico City", image: img("1518105779142-d975f22f1b0a") },
  { city: "Kyoto", image: img("1528127269322-539801943592") },
];

const runSearch = (q: string) => router.push({ pathname: "/results", params: { q } });

export default function Explore() {
  const { recent } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <SearchPill title="Where to?" subtitle="Describe your perfect tour" onPress={() => router.push("/search")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.label}
              style={styles.category}
              onPress={() => router.push({ pathname: "/search", params: { draft: c.draft } })}
            >
              <Ionicons name={c.icon} size={24} color={colors.textMuted} />
              <Text style={styles.categoryLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={type.display}>Find a local guide{"\n"}who gets you.</Text>
        <Text style={[type.caption, { marginTop: space(2), fontSize: 15 }]}>
          Tell us the trip in your own words. We search tour marketplaces and rank what fits.
        </Text>

        <Text style={[type.heading, styles.section]}>Try asking</Text>
        {IDEAS.map((idea) => (
          <Pressable
            key={idea}
            style={({ pressed }) => [styles.idea, pressed && { backgroundColor: colors.surfaceAlt }]}
            onPress={() => runSearch(idea)}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.brand} />
            <Text style={[type.body, { flex: 1 }]}>{idea}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}

        <Text style={[type.heading, styles.section]}>Popular destinations</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space(3) }}
          style={{ marginHorizontal: -space(6) }}
        >
          <View style={{ width: space(3) }} />
          {DESTINATIONS.map((d) => (
            <Pressable key={d.city} onPress={() => runSearch(`Best guided tours in ${d.city}`)} style={styles.dest}>
              <Image source={{ uri: d.image }} style={styles.destImage} contentFit="cover" transition={200} />
              <Text style={[type.bodyStrong, { marginTop: space(2) }]}>{d.city}</Text>
            </Pressable>
          ))}
          <View style={{ width: space(3) }} />
        </ScrollView>

        {recent.length > 0 && (
          <>
            <Text style={[type.heading, styles.section]}>Recent searches</Text>
            {recent.slice(0, 4).map((r) => (
              <Pressable key={r} style={styles.recent} onPress={() => runSearch(r)}>
                <View style={styles.recentIcon}>
                  <Ionicons name="time-outline" size={18} color={colors.text} />
                </View>
                <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        <View style={styles.business}>
          <BusinessLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: space(6),
    paddingTop: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  categories: { gap: space(7), paddingVertical: space(4), paddingRight: space(6) },
  category: { alignItems: "center", gap: 6 },
  categoryLabel: { fontSize: 12, fontWeight: "500", color: colors.textMuted },
  content: { padding: space(6), paddingBottom: space(12) },
  section: { marginTop: space(8), marginBottom: space(3) },
  idea: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: space(3),
  },
  dest: { width: 150 },
  destImage: { width: 150, height: 150, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  business: {
    marginTop: space(10),
    paddingTop: space(6),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recent: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(2) },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
});
