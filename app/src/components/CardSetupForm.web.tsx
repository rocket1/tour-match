import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "../theme";
import type { CardSetupProps } from "./CardSetupForm";
import { Button } from "./Form";

const stripeCache = new Map<string, Promise<Stripe | null>>();

/**
 * Web card form. Stripe Elements renders the card inputs in a Stripe-hosted iframe,
 * so card numbers never touch our page's JavaScript or our server.
 */
export function CardSetupForm(props: CardSetupProps) {
  const stripePromise = useMemo(() => {
    if (!stripeCache.has(props.publishableKey)) stripeCache.set(props.publishableKey, loadStripe(props.publishableKey));
    return stripeCache.get(props.publishableKey)!;
  }, [props.publishableKey]);

  return (
    <Elements stripe={stripePromise}>
      <WebCardForm {...props} />
    </Elements>
  );
}

function WebCardForm({ createSetupIntent, onConfirmed }: CardSetupProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const card = elements?.getElement(CardElement);
    if (!stripe || !card) return;
    setBusy(true);
    setError(null);
    try {
      const { clientSecret } = await createSetupIntent();
      const result = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } });
      if (result.error) throw new Error(result.error.message);
      await onConfirmed(result.setupIntent.id);
      card.clear();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>Card details</Text>
      <View style={styles.field}>
        <CardElement
          onChange={(e) => {
            setComplete(e.complete);
            setError(e.error?.message ?? null);
          }}
          options={{
            hidePostalCode: false,
            style: {
              base: {
                fontSize: "16px",
                color: colors.text,
                fontFamily: "system-ui, sans-serif",
                "::placeholder": { color: colors.textMuted },
              },
              invalid: { color: colors.brandDark },
            },
          }}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label="Save card" icon="lock-closed-outline" onPress={save} loading={busy} disabled={!complete || !stripe} />
      <Text style={[type.caption, { marginTop: space(2) }]}>Secured by Stripe. We never see or store your full card number.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, marginBottom: space(1) },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: 15,
    marginBottom: space(4),
  },
  error: { color: colors.brandDark, marginBottom: space(3) },
});
