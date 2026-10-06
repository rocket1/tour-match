import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdvertiserProvider } from "../advertiser/session";
import { StoreProvider } from "../store";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AdvertiserProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="search" options={{ presentation: "fullScreenModal", animation: "fade_from_bottom" }} />
            <Stack.Screen name="results" />
            <Stack.Screen name="tour/[id]" />
          </Stack>
        </AdvertiserProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
