import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  AD_CATEGORIES,
  CampaignError,
  createDraft,
  deleteDraft,
  duplicateCampaign,
  editCampaign,
  getForAccount,
  launch,
  listForAccount,
  setPaused,
  stopCampaign,
} from "../ads.js";
import {
  accountForToken,
  checkCredentials,
  createAccount,
  endAllSessions,
  endSession,
  findByEmail,
  startSession,
  toPublicAdvertiser,
  updateAccount,
  type AdvertiserAccount,
} from "../advertisers/accounts.js";
import {
  BillingError,
  billingEnabled,
  CPC_CENTS,
  createSetupIntent,
  CURRENCY,
  listCharges,
  MIN_BUDGET_CENTS,
  publishableKey,
  removeCard,
  saveCardFromSetupIntent,
} from "../advertisers/billing.js";
import { hashPassword, verifyPassword } from "../auth.js";
import { TERMS_VERSIONS } from "../legal.js";
import { rateLimit } from "../rateLimit.js";

type Env = { Variables: { account: AdvertiserAccount; token: string } };
export const advertiserAccountRoutes = new Hono<Env>();

const issuesOf = (err: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
};
const body = async <T extends z.ZodType>(c: Context, schema: T) => schema.safeParse(await c.req.json().catch(() => null));

// Map domain errors to HTTP responses.
advertiserAccountRoutes.onError((err, c) => {
  if (err instanceof CampaignError || err instanceof BillingError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Something went wrong. Try again." }, 500);
});

// --- Public ------------------------------------------------------------------

advertiserAccountRoutes.get("/config", (c) =>
  c.json({
    billingEnabled,
    stripePublishableKey: billingEnabled ? publishableKey : null,
    currency: CURRENCY,
    cpcCents: CPC_CENTS,
    minBudgetCents: MIN_BUDGET_CENTS,
    categories: AD_CATEGORIES,
    termsVersion: TERMS_VERSIONS.advertiser,
  }),
);

const password = z.string().min(10, "Use at least 10 characters.").max(200);

const Signup = z.object({
  email: z.email(),
  password,
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  website: z.url().max(300).nullable().optional(),
  termsVersion: z.string(),
  acceptTerms: z.literal(true, "You need to accept the Advertiser Terms."),
});

advertiserAccountRoutes.post("/signup", rateLimit({ limit: 10, windowMs: 60 * 60_000 }), async (c) => {
  const parsed = await body(c, Signup);
  if (!parsed.success) return c.json({ error: "Check the form fields.", issues: issuesOf(parsed.error) }, 400);
  const input = parsed.data;
  if (input.termsVersion !== TERMS_VERSIONS.advertiser) {
    return c.json({ error: "The terms have been updated. Reload and review them again." }, 409);
  }
  if (await findByEmail(input.email)) {
    return c.json({ error: "An account with this email already exists.", issues: { email: "Already registered. Sign in instead." } }, 409);
  }
  const account = await createAccount({ ...input, website: input.website ?? null });
  const token = await startSession(account.id);
  return c.json({ token, account: toPublicAdvertiser(account) }, 201);
});

advertiserAccountRoutes.post("/login", rateLimit({ limit: 10, windowMs: 15 * 60_000 }), async (c) => {
  const parsed = await body(c, z.object({ email: z.string(), password: z.string() }));
  if (!parsed.success) return c.json({ error: "Enter your email and password." }, 400);
  const account = await checkCredentials(parsed.data.email, parsed.data.password);
  if (!account) return c.json({ error: "Email or password is incorrect." }, 401);
  const token = await startSession(account.id);
  return c.json({ token, account: toPublicAdvertiser(account) });
});

// --- Authenticated -----------------------------------------------------------

advertiserAccountRoutes.use("/me/*", async (c, next) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const account = await accountForToken(token);
  if (!account || !token) return c.json({ error: "Please sign in again." }, 401);
  c.set("account", account);
  c.set("token", token);
  await next();
});

advertiserAccountRoutes.get("/me/account", (c) => c.json({ account: toPublicAdvertiser(c.get("account")) }));

advertiserAccountRoutes.patch("/me/account", async (c) => {
  const parsed = await body(
    c,
    z.object({
      companyName: z.string().trim().min(2).max(120).optional(),
      contactName: z.string().trim().min(2).max(120).optional(),
      website: z.url().max(300).nullable().optional(),
    }),
  );
  if (!parsed.success) return c.json({ error: "Check the form fields.", issues: issuesOf(parsed.error) }, 400);
  const updated = await updateAccount(c.get("account").id, (a) => Object.assign(a, parsed.data));
  return c.json({ account: toPublicAdvertiser(updated!) });
});

advertiserAccountRoutes.post("/me/password", rateLimit({ limit: 5, windowMs: 15 * 60_000 }), async (c) => {
  const parsed = await body(c, z.object({ currentPassword: z.string(), newPassword: password }));
  if (!parsed.success) return c.json({ error: "Check the form fields.", issues: issuesOf(parsed.error) }, 400);
  const account = c.get("account");
  if (!(await verifyPassword(parsed.data.currentPassword, account.passwordHash))) {
    return c.json({ error: "Current password is incorrect.", issues: { currentPassword: "Incorrect password." } }, 400);
  }
  const hash = await hashPassword(parsed.data.newPassword);
  await updateAccount(account.id, (a) => (a.passwordHash = hash));
  await endAllSessions(account.id); // sign out everywhere else
  return c.json({ token: await startSession(account.id) });
});

advertiserAccountRoutes.post("/me/logout", async (c) => {
  await endSession(c.get("token"));
  return c.json({ ok: true });
});

// Billing

advertiserAccountRoutes.get("/me/billing", async (c) => {
  const account = c.get("account");
  return c.json({ billingEnabled, card: account.card, charges: await listCharges(account.id) });
});

advertiserAccountRoutes.post("/me/billing/setup-intent", async (c) => c.json(await createSetupIntent(c.get("account"))));

advertiserAccountRoutes.post("/me/billing/card", async (c) => {
  const parsed = await body(c, z.object({ setupIntentId: z.string().startsWith("seti_") }));
  if (!parsed.success) return c.json({ error: "Missing setupIntentId." }, 400);
  return c.json({ card: await saveCardFromSetupIntent(c.get("account"), parsed.data.setupIntentId) });
});

advertiserAccountRoutes.delete("/me/billing/card", async (c) => {
  await removeCard(c.get("account"));
  return c.json({ ok: true });
});

// Ads

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const httpsUrl = z.url().refine((u) => u.startsWith("https://"), "Must start with https://");

const AdContent = z.object({
  headline: z.string().trim().min(5, "At least 5 characters.").max(80),
  body: z.string().trim().max(200).default(""),
  imageUrl: httpsUrl.nullable().default(null),
  url: httpsUrl,
  ctaLabel: z.string().trim().min(2).max(30).default("Learn more"),
  category: z.enum(AD_CATEGORIES),
  destinations: z.array(z.string().max(80)).max(30).default([]),
  interests: z.array(z.string().max(40)).max(20).default([]),
  startDate: isoDate.nullable().default(null),
  endDate: isoDate.nullable().default(null),
});

advertiserAccountRoutes.get("/me/campaigns", async (c) => c.json({ campaigns: await listForAccount(c.get("account").id) }));

advertiserAccountRoutes.post("/me/campaigns", async (c) => {
  const parsed = await body(c, AdContent);
  if (!parsed.success) return c.json({ error: "Check the ad details.", issues: issuesOf(parsed.error) }, 400);
  return c.json({ campaign: await createDraft(c.get("account"), parsed.data) }, 201);
});

advertiserAccountRoutes.get("/me/campaigns/:id", async (c) =>
  c.json({ campaign: await getForAccount(c.get("account").id, c.req.param("id")) }),
);

advertiserAccountRoutes.put("/me/campaigns/:id", async (c) => {
  const parsed = await body(c, AdContent);
  if (!parsed.success) return c.json({ error: "Check the ad details.", issues: issuesOf(parsed.error) }, 400);
  return c.json({ campaign: await editCampaign(c.get("account").id, c.req.param("id"), parsed.data) });
});

advertiserAccountRoutes.delete("/me/campaigns/:id", async (c) => {
  await deleteDraft(c.get("account").id, c.req.param("id"));
  return c.json({ ok: true });
});

const Launch = z.object({ addBudgetCents: z.number().int().min(0).max(10_000_000), endDate: isoDate.nullable() });

// Submit a draft, resubmit a rejected ad, or re-enable an ended one.
advertiserAccountRoutes.post("/me/campaigns/:id/launch", async (c) => {
  const parsed = await body(c, Launch);
  if (!parsed.success) return c.json({ error: "Check the budget and end date.", issues: issuesOf(parsed.error) }, 400);
  return c.json({ campaign: await launch(c.get("account"), c.req.param("id"), parsed.data) });
});

advertiserAccountRoutes.post("/me/campaigns/:id/pause", async (c) =>
  c.json({ campaign: await setPaused(c.get("account").id, c.req.param("id"), true) }),
);
advertiserAccountRoutes.post("/me/campaigns/:id/resume", async (c) =>
  c.json({ campaign: await setPaused(c.get("account").id, c.req.param("id"), false) }),
);
advertiserAccountRoutes.post("/me/campaigns/:id/stop", async (c) => c.json(await stopCampaign(c.get("account").id, c.req.param("id"))));
advertiserAccountRoutes.post("/me/campaigns/:id/duplicate", async (c) =>
  c.json({ campaign: await duplicateCampaign(c.get("account"), c.req.param("id")) }, 201),
);
