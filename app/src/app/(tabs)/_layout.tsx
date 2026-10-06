import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { colors } from "../../theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarStyle: { borderTopColor: colors.hairline },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Explore", tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: "Saved", tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
