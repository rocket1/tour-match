import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, space } from "../theme";

/** The Airbnb-style floating search pill. Tapping opens the prompt screen. */
export function SearchPill({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, shadow, pressed && { opacity: 0.9 }]}
      accessibilityRole="search"
    >
      <Ionicons name="search" size={20} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.spark}>
        <Ionicons name="sparkles" size={16} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingLeft: space(5),
    paddingRight: space(2),
    paddingVertical: space(2),
    minHeight: 58,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  spark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
