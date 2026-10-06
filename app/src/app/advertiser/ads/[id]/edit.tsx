import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdEditor } from "../../../../advertiser/AdEditor";
import { useRequireAdvertiser } from "../../../../advertiser/session";
import { ScreenHeader } from "../../../../components/Form";
import { colors, space, type } from "../../../../theme";
import type { Campaign } from "../../../../types";

export default function EditAd() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, api } = useRequireAdvertiser();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account)
      api.campaign(id).then(
        (r) => setCampaign(r.campaign),
        (e: Error) => setError(e.message),
      );
  }, [account, api, id]);

  const note =
    campaign?.status === "active" || campaign?.status === "paused"
      ? "Changing the headline, description, button, link, image or category sends the ad back to review. Targeting and dates update immediately."
      : campaign?.status === "rejected"
        ? `Rejected: ${campaign.rejectionReason ?? "see the ad page"}. Fix the issue, save, then resubmit.`
        : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Edit ad" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            {error && <Text style={{ color: colors.brandDark }}>{error}</Text>}
            {!campaign && !error && <ActivityIndicator />}
            {campaign && account && (
              <>
                <Text style={type.display}>Edit ad</Text>
                <AdEditor
                  initial={campaign}
                  advertiser={account.companyName}
                  submitLabel="Save changes"
                  note={note}
                  onSubmit={async (content) => {
                    await api.updateCampaign(campaign.id, content);
                    router.back();
                  }}
                />
              </>
            )}
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
