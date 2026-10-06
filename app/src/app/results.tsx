import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchTours } from "../api";
import { SearchPill } from "../components/SearchPill";
import { SkeletonCard } from "../components/Skeleton";
import { SponsoredCard } from "../components/SponsoredCard";
import { TourCard } from "../components/TourCard";
import { intentChips } from "../format";
import { useStore } from "../store";
import { useColumns } from "../useColumns";
import { colors, radius, space, type } from "../theme";
import type { SearchResponse } from "../types";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: SearchResponse };

export default function Results() {
  const { q = "" } = useLocalSearchParams<{ q: string }>();
  const { addRecent } = useStore();
  const [state, setState] = useState<State>({ status: "loading" });
  const cols = useColumns();

  const load = useCallback(
    (signal?: AbortSignal) => {
      setState({ status: "loading" });
      searchTours(q, signal)
        .then((data) => {
          setState({ status: "done", data });
          addRecent(q);
        })
        .catch((e: Error) => {
          if (e.name !== "AbortError") setState({ status: "error", message: e.message });
        });
    },
    [q, addRecent],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const data = state.status === "done" ? state.data : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <SearchPill
            title={data?.intent.headline || q}
            subtitle={state.status === "loading" ? "Searching tour sites…" : "Tap to refine"}
            onPress={() => router.push({ pathname: "/search", params: { draft: q } })}
          />
        </View>
      </View>

      {state.status === "loading" && (
        <View style={styles.list}>
          <View style={styles.thinking}>
            <Ionicons name="sparkles" size={16} color={colors.brand} />
            <Text style={type.caption}>Reading your request and checking providers…</Text>
          </View>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}

      {state.status === "error" && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={[type.heading, { marginTop: space(3) }]}>Couldn't reach the search server</Text>
          <Text style={[type.caption, { textAlign: "center", marginTop: space(1) }]}>{state.message}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => load()}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {data && (
        <FlatList
          data={data.tours}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap: space(6) } : undefined}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TourCard tour={item} />}
          ListHeaderComponent={<ResultsHeader data={data} />}
          ListEmptyComponent={<EmptyState data={data} />}
          ListFooterComponent={<ResultsFooter data={data} />}
        />
      )}
    </SafeAreaView>
  );
}

function ResultsHeader({ data }: { data: SearchResponse }) {
  const chips = intentChips(data.intent);
  return (
    <View style={{ marginBottom: space(5) }}>
      {chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={{ marginHorizontal: -space(6) }}
        >
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      {data.intent.followUpQuestion && !data.intent.destination ? (
        <Pressable style={styles.followUp} onPress={() => router.push("/search")}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.brand} />
          <Text style={[type.bodyStrong, { flex: 1 }]}>{data.intent.followUpQuestion}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.text} />
        </Pressable>
      ) : (
        !!data.summary && (
          <View style={styles.summary}>
            <Ionicons name="sparkles" size={16} color={colors.brand} style={{ marginTop: 2 }} />
            <Text style={[type.body, { flex: 1 }]}>{data.summary}</Text>
          </View>
        )
      )}
      {data.sponsored && (
        <View style={{ marginTop: space(5), marginBottom: -space(4) }}>
          <SponsoredCard ad={data.sponsored} />
        </View>
      )}
      {data.tours.length > 0 && (
        <Text style={[type.caption, { marginTop: space(4) }]}>
          {data.tours.length} {data.tours.length === 1 ? "tour" : "tours"} · best match first
        </Text>
      )}
    </View>
  );
}

function EmptyState({ data }: { data: SearchResponse }) {
  if (!data.intent.destination) return null;
  return (
    <View style={[styles.center, { paddingVertical: space(8) }]}>
      <Ionicons name="map-outline" size={40} color={colors.textMuted} />
      <Text style={[type.heading, { marginTop: space(3) }]}>No bookable tours matched</Text>
      <Text style={[type.caption, { textAlign: "center", marginTop: space(1) }]}>
        Try loosening a filter, or browse the guide marketplaces below.
      </Text>
    </View>
  );
}

function ResultsFooter({ data }: { data: SearchResponse }) {
  const failed = data.providers.filter((p) => p.error);
  return (
    <View style={{ paddingBottom: space(12) }}>
      {data.links.length > 0 && (
        <>
          <Text style={[type.heading, { marginBottom: space(1) }]}>Search more local-guide sites</Text>
          <Text style={[type.caption, { marginBottom: space(3) }]}>
            These don't offer a public API, so we open their search for you.
          </Text>
          {data.links.map((l) => (
            <Pressable key={l.providerId} style={styles.linkRow} onPress={() => WebBrowser.openBrowserAsync(l.url)}>
              <View style={styles.linkIcon}>
                <Text style={styles.linkInitial}>{l.providerName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.bodyStrong}>{l.providerName}</Text>
                <Text style={type.caption}>{l.blurb}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </>
      )}
      {failed.length > 0 && (
        <Text style={[type.caption, { marginTop: space(4) }]}>
          Unavailable right now: {failed.map((f) => f.providerName).join(", ")}
        </Text>
      )}
      {!data.aiUsed && (
        <Text style={[type.caption, { marginTop: space(2) }]}>AI is off on the server; results use keyword matching.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: space(6) },
  thinking: { flexDirection: "row", gap: space(2), alignItems: "center", marginBottom: space(5) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space(8) },
  primaryBtn: {
    marginTop: space(5),
    backgroundColor: colors.text,
    paddingHorizontal: space(6),
    paddingVertical: space(3),
    borderRadius: radius.sm,
  },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  chips: { gap: space(2), paddingHorizontal: space(6), paddingBottom: space(4) },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.text },
  summary: {
    flexDirection: "row",
    gap: space(2),
    backgroundColor: colors.surfaceAlt,
    padding: space(4),
    borderRadius: radius.md,
  },
  followUp: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    borderWidth: 1,
    borderColor: colors.brand,
    padding: space(4),
    borderRadius: radius.md,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  linkInitial: { fontSize: 18, fontWeight: "700", color: colors.text },
});
