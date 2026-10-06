import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAdvertiser } from "../advertiser/session";
import { colors, radius, space, type } from "../theme";

interface LinkItem {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
}

function LinkList({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <View>
      <Text style={[type.heading, { marginBottom: space(3) }]}>{title}</Text>
      {links.map((l) => (
        <Pressable
          key={l.title}
          onPress={() => router.push(l.href)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
          accessibilityRole="link"
        >
          <View style={styles.icon}>
            <Ionicons name={l.icon} size={20} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.bodyStrong}>{l.title}</Text>
            {!!l.body && <Text style={type.caption}>{l.body}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

export function BusinessLinks() {
  const { account } = useAdvertiser();
  return (
    <LinkList
      title="TourMatch for business"
      links={[
        {
          href: "/partners",
          icon: "code-slash-outline",
          title: "List your tours",
          body: "Tour companies: connect your booking API with our partner toolkit.",
        },
        account
          ? {
              href: "/advertiser",
              icon: "stats-chart-outline",
              title: "Ads Manager",
              body: `Signed in as ${account.companyName}`,
            }
          : {
              href: "/advertise",
              icon: "megaphone-outline",
              title: "Advertise with us",
              body: "Reach travellers planning trips to your city.",
            },
      ]}
    />
  );
}

export function HelpLinks() {
  return (
    <LinkList
      title="Help & legal"
      links={[
        {
          href: { pathname: "/support/[audience]", params: { audience: "traveler" } },
          icon: "help-buoy-outline",
          title: "Contact support",
        },
        {
          href: { pathname: "/legal/[audience]", params: { audience: "traveler" } },
          icon: "document-text-outline",
          title: "Terms of Service",
        },
        {
          href: { pathname: "/legal/[audience]", params: { audience: "advertiser" } },
          icon: "megaphone-outline",
          title: "Advertiser Terms",
        },
        {
          href: { pathname: "/legal/[audience]", params: { audience: "partner" } },
          icon: "business-outline",
          title: "Partner Terms",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(3),
    paddingHorizontal: space(2),
    marginHorizontal: -space(2),
    borderRadius: radius.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
});
