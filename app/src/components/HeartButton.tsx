import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet } from "react-native";
import { useStore } from "../store";
import { colors } from "../theme";
import type { RankedTour } from "../types";

export function HeartButton({ tour, size = 26, onDark = true }: { tour: RankedTour; size?: number; onDark?: boolean }) {
  const { isSaved, toggleSaved } = useStore();
  const saved = isSaved(tour.id);
  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save tour"}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        toggleSaved(tour);
      }}
      style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.9 }] }]}
    >
      <Ionicons
        name={saved ? "heart" : "heart-outline"}
        size={size}
        color={saved ? colors.brand : onDark ? "#fff" : colors.text}
        style={onDark && !saved ? styles.outline : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2 },
  outline: { textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4 },
});
