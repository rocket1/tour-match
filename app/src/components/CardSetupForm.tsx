import { CardField, StripeProvider, confirmSetupIntent } from "@stripe/stripe-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "../theme";
import { Button } from "./Form";

export interface CardSetupProps {
  publishableKey: string;
  /** Creates a SetupIntent on our server and returns its client secret. */
  createSetupIntent: () => Promise<{ clientSecret: string }>;
  /** Called with the confirmed SetupIntent ID so the server can verify and save the card. */
  onConfirmed: (setupIntentId: string) => Promise<void>;
}

/**
 * Native card form. Stripe's CardField renders and owns the card inputs, so card
 * numbers go straight to Stripe and never reach our JavaScript or our server.
 */
export function CardSetupForm(props: CardSetupProps) {
  return (
    <StripeProvider publishableKey={props.publishableKey}>
      <NativeCardForm {...props} />
    </StripeProvider>
  );
}

function NativeCardForm({ createSetupIntent, onConfirmed }: CardSetupProps) {
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { clientSecret } = await createSetupIntent();
      const { setupIntent, error: stripeError } = await confirmSetupIntent(clientSecret, { paymentMethodType: "Card" });
      if (stripeError) throw new Error(stripeError.localizedMessage ?? stripeError.message);
      await onConfirmed(setupIntent.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>Card details</Text>
      <CardField
        postalCodeEnabled
        style={styles.field}
        cardStyle={{ backgroundColor: "#FFFFFF", textColor: colors.text, borderRadius: radius.sm, fontSize: 16 }}
        onCardChange={(d) => setComplete(d.complete)}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label="Save card" icon="lock-closed-outline" onPress={save} loading={busy} disabled={!complete} />
      <Text style={[type.caption, { marginTop: space(2) }]}>Secured by Stripe. We never see or store your full card number.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, marginBottom: space(1) },
  field: {
    height: 52,
    marginBottom: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  error: { color: colors.brandDark, marginBottom: space(3) },
});
