import { router } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdEditor, EMPTY_AD } from "../../../advertiser/AdEditor";
import { useRequireAdvertiser } from "../../../advertiser/session";
import { ScreenHeader } from "../../../components/Form";
import { colors, space, type } from "../../../theme";

export default function NewAd() {
  const { account, api } = useRequireAdvertiser();
  if (!account) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Create an ad" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={type.display}>New ad</Text>
            <Text style={[type.caption, { fontSize: 15, marginTop: space(2) }]}>
              Save a draft first. You'll set the budget and launch on the next screen.
            </Text>
            <AdEditor
              initial={EMPTY_AD}
              advertiser={account.companyName}
              submitLabel="Save draft & continue"
              onSubmit={async (content) => {
                const { campaign } = await api.createCampaign(content);
                router.replace({ pathname: "/advertiser/ads/[id]", params: { id: campaign.id } });
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space(6), paddingBottom: space(16) },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
});
