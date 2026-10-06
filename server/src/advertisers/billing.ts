import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { JsonStore } from "../store.js";
import { updateAccount, type AdvertiserAccount, type SavedCard } from "./accounts.js";

// Card data never touches this server: the app collects it with Stripe's own card field
// and we only ever see Stripe IDs. Billing is off unless STRIPE_SECRET_KEY is set.
const secretKey = process.env.STRIPE_SECRET_KEY;
export const billingEnabled = Boolean(secretKey && process.env.STRIPE_PUBLISHABLE_KEY);
export const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? null;
const stripe = billingEnabled ? new Stripe(secretKey!) : null;

export const CURRENCY = "usd";
export const MIN_BUDGET_CENTS = 2_000; // $20
export const CPC_CENTS = Number(process.env.AD_CPC_CENTS ?? 60); // price per click

export interface Charge {
  id: string;
  accountId: string;
  campaignId: string;
  amountCents: number;
  refundedCents: number;
  currency: string;
  status: "succeeded" | "refunded" | "partially_refunded" | "not_billed";
  description: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

const charges = new JsonStore<Charge[]>("charges.json", () => []);

export class BillingError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 402 | 503 = 402,
  ) {
    super(message);
  }
}

export async function listCharges(accountId: string) {
  return (await charges.read()).filter((c) => c.accountId === accountId).reverse();
}

async function ensureCustomer(account: AdvertiserAccount): Promise<string> {
  if (account.stripeCustomerId) return account.stripeCustomerId;
  const customer = await stripe!.customers.create({
    email: account.email,
    name: account.companyName,
    metadata: { advertiserId: account.id },
  });
  await updateAccount(account.id, (a) => (a.stripeCustomerId = customer.id));
  return customer.id;
}

/** Step 1 of saving a card: the app confirms this SetupIntent with Stripe's card field. */
export async function createSetupIntent(account: AdvertiserAccount) {
  if (!stripe) throw new BillingError("Billing isn't configured on this server.", 503);
  const customer = await ensureCustomer(account);
  const intent = await stripe.setupIntents.create({
    customer,
    usage: "off_session",
    payment_method_types: ["card"],
    metadata: { advertiserId: account.id },
  });
  return { clientSecret: intent.client_secret!, publishableKey: publishableKey! };
}

/** Step 2: after the app confirms, verify with Stripe and store the card summary. */
export async function saveCardFromSetupIntent(account: AdvertiserAccount, setupIntentId: string): Promise<SavedCard> {
  if (!stripe) throw new BillingError("Billing isn't configured on this server.", 503);
  const intent = await stripe.setupIntents.retrieve(setupIntentId);
  const customer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
  if (customer !== account.stripeCustomerId) throw new BillingError("That card setup doesn't belong to this account.", 400);
  if (intent.status !== "succeeded") throw new BillingError("The card wasn't confirmed. Try again.", 400);

  const pmId = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
  if (!pmId) throw new BillingError("No card was attached.", 400);
  const pm = await stripe.paymentMethods.retrieve(pmId);
  await stripe.customers.update(customer, { invoice_settings: { default_payment_method: pmId } });

  const card: SavedCard = {
    paymentMethodId: pmId,
    brand: pm.card?.brand ?? "card",
    last4: pm.card?.last4 ?? "????",
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
  };
  // Detach the previous card so only one stays on file.
  const previous = account.card?.paymentMethodId;
  await updateAccount(account.id, (a) => (a.card = card));
  if (previous && previous !== pmId) await stripe.paymentMethods.detach(previous).catch(() => {});
  return card;
}

export async function removeCard(account: AdvertiserAccount) {
  if (stripe && account.card) await stripe.paymentMethods.detach(account.card.paymentMethodId).catch(() => {});
  await updateAccount(account.id, (a) => (a.card = null));
}

/** Charge a campaign budget to the card on file. */
export async function chargeBudget(
  account: AdvertiserAccount,
  campaignId: string,
  amountCents: number,
  description: string,
): Promise<Charge> {
  const base = {
    id: `ch_${randomBytes(6).toString("hex")}`,
    accountId: account.id,
    campaignId,
    amountCents,
    refundedCents: 0,
    currency: CURRENCY,
    description,
    createdAt: new Date().toISOString(),
  };

  let charge: Charge;
  if (!stripe) {
    // Dev mode: record it, clearly marked, without taking money.
    charge = { ...base, status: "not_billed", stripePaymentIntentId: null };
  } else {
    if (!account.card || !account.stripeCustomerId) throw new BillingError("Add a card before launching an ad.");
    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: CURRENCY,
          customer: account.stripeCustomerId,
          payment_method: account.card.paymentMethodId,
          off_session: true,
          confirm: true,
          description,
          metadata: { advertiserId: account.id, campaignId },
        },
        { idempotencyKey: base.id },
      );
      if (intent.status !== "succeeded") throw new BillingError("The payment didn't go through. Try another card.");
      charge = { ...base, status: "succeeded", stripePaymentIntentId: intent.id };
    } catch (err) {
      if (err instanceof BillingError) throw err;
      if (err instanceof Stripe.errors.StripeCardError) {
        throw new BillingError(
          err.code === "authentication_required"
            ? "Your bank needs to verify this card. Re-add it on the Billing page, then try again."
            : (err.message ?? "Your card was declined."),
        );
      }
      throw err;
    }
  }
  await charges.update((all) => void all.push(charge));
  return charge;
}

/** Refund unspent budget, newest charges first. Returns the amount refunded. */
export async function refundUnspent(campaignId: string, amountCents: number): Promise<number> {
  let remaining = amountCents;
  const list = (await charges.read()).filter((c) => c.campaignId === campaignId).reverse();
  for (const c of list) {
    if (remaining <= 0) break;
    const refundable = c.amountCents - c.refundedCents;
    if (refundable <= 0) continue;
    const amount = Math.min(refundable, remaining);
    if (c.status !== "not_billed" && stripe && c.stripePaymentIntentId) {
      await stripe.refunds.create({ payment_intent: c.stripePaymentIntentId, amount });
    }
    await charges.update((all) => {
      const x = all.find((y) => y.id === c.id)!;
      x.refundedCents += amount;
      if (x.status !== "not_billed") x.status = x.refundedCents >= x.amountCents ? "refunded" : "partially_refunded";
    });
    remaining -= amount;
  }
  return amountCents - remaining;
}
