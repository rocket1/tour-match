import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TourCard } from "../../components/TourCard";
import { useStore } from "../../store";
import { useColumns } from "../../useColumns";
import { colors, radius, space, type } from "../../theme";

export default function Saved() {
  const { saved } = useStore();
  const cols = useColumns();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={saved}
        key={cols}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? { gap: space(6) } : undefined}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={[type.display, { marginBottom: space(6) }]}>Saved</Text>}
        renderItem={({ item }) => <TourCard tour={item} showReason={false} />}
        ListEmptyComponent={
          <View>
            <Text style={type.heading}>Create your first list</Text>
            <Text style={[type.caption, { fontSize: 15, marginTop: space(2) }]}>
              As you search, tap the heart icon to save tours and guides you like.
            </Text>
            <Pressable style={styles.btn} onPress={() => router.navigate("/")}>
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.btnText}>Start exploring</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  list: { padding: space(6) },
  btn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: space(2),
    alignItems: "center",
    marginTop: space(6),
    backgroundColor: colors.text,
    paddingHorizontal: space(6),
    paddingVertical: space(3),
    borderRadius: radius.sm,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
