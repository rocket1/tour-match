import { createHash, randomBytes } from "node:crypto";
import type { AdvertiserAccount } from "./advertisers/accounts.js";
import { BillingError, chargeBudget, CPC_CENTS, MIN_BUDGET_CENTS, refundUnspent } from "./advertisers/billing.js";
import { JsonStore } from "./store.js";
import type { SearchIntent, SponsoredPlacement } from "./types.js";

export const AD_CATEGORIES = [
  "attractions",
  "tours",
  "food_drink",
  "transport",
  "accommodation",
  "events",
  "shopping",
  "services",
] as const;
export type AdCategory = (typeof AD_CATEGORIES)[number];

/**
 * draft ──submit+pay──▶ in_review ──approve──▶ active ◀──▶ paused
 *   ▲                      │ reject (refund)       │ end date / budget spent / stopped
 *   └── edit ── rejected ◀─┘                       ▼
 *                                                ended ──re-enable (top up)──▶ active or in_review
 */
export type CampaignStatus = "draft" | "in_review" | "active" | "paused" | "rejected" | "ended";
export type EndReason = "completed" | "budget_spent" | "stopped";

export interface CampaignContent {
  headline: string;
  body: string;
  imageUrl: string | null;
  url: string;
  ctaLabel: string;
  category: AdCategory;
  destinations: string[]; // lower-case; empty = everywhere
  interests: string[]; // lower-case; empty = any
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
}

export interface Campaign extends CampaignContent {
  id: string;
  /** null = house ad created by an admin (unbilled, no budget). */
  accountId: string | null;
  advertiser: string;
  status: CampaignStatus;
  endReason: EndReason | null;
  rejectionReason: string | null;
  budgetCents: number; // total funded, net of refunds
  spentCents: number;
  impressions: number;
  clicks: number;
  approvedContentHash: string | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}

export interface AdvertiserInquiry {
  id: string;
  company: string;
  contactName: string;
  email: string;
  website: string | null;
  markets: string | null;
  monthlyBudget: string | null;
  message: string | null;
  createdAt: string;
}

const campaigns = new JsonStore<Campaign[]>("campaigns.json", () => []);
const inquiries = new JsonStore<AdvertiserInquiry[]>("advertiser-inquiries.json", () => []);

export class CampaignError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400,
  ) {
    super(message);
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

// Only the creative affects review; budget and dates can change without re-approval.
function contentHash(c: CampaignContent): string {
  const { headline, body, imageUrl, url, ctaLabel, category } = c;
  return createHash("sha256").update(JSON.stringify({ headline, body, imageUrl, url, ctaLabel, category })).digest("hex");
}

/** Move running campaigns to `ended` when their end date passes or budget runs out. Mutates. */
function settle(c: Campaign): boolean {
  if (c.status !== "active" && c.status !== "paused") return false;
  let reason: EndReason | null = null;
  if (c.endDate && c.endDate < today()) reason = "completed";
  else if (c.accountId && c.budgetCents - c.spentCents < CPC_CENTS) reason = "budget_spent";
  if (!reason) return false;
  Object.assign(c, { status: "ended", endReason: reason, endedAt: now(), updatedAt: now() });
  return true;
}

async function settleAll(): Promise<Campaign[]> {
  const all = await campaigns.read();
  if (all.some((c) => settle({ ...c }))) await campaigns.update((list) => list.forEach(settle));
  return campaigns.read();
}

async function mutate<T>(id: string, accountId: string | null | undefined, fn: (c: Campaign) => T): Promise<T> {
  await settleAll();
  return campaigns.update((all) => {
    const c = all.find((x) => x.id === id && (accountId === undefined || x.accountId === accountId));
    if (!c) throw new CampaignError("Ad not found.", 404);
    const result = fn(c);
    c.updatedAt = now();
    return result;
  });
}

function assertDates(c: Pick<CampaignContent, "startDate" | "endDate">) {
  if (c.endDate && c.endDate < today()) throw new CampaignError("The end date is in the past.");
  if (c.startDate && c.endDate && c.endDate < c.startDate) throw new CampaignError("The end date is before the start date.");
}

// --- Advertiser actions ------------------------------------------------------

export async function listForAccount(accountId: string) {
  return (await settleAll()).filter((c) => c.accountId === accountId).reverse();
}

export async function getForAccount(accountId: string, id: string) {
  const c = (await settleAll()).find((x) => x.id === id && x.accountId === accountId);
  if (!c) throw new CampaignError("Ad not found.", 404);
  return c;
}

function normalize(input: CampaignContent): CampaignContent {
  return {
    ...input,
    destinations: [...new Set(input.destinations.map((d) => d.trim().toLowerCase()).filter(Boolean))],
    interests: [...new Set(input.interests.map((i) => i.trim().toLowerCase()).filter(Boolean))],
  };
}

export async function createDraft(account: AdvertiserAccount, input: CampaignContent): Promise<Campaign> {
  const c: Campaign = {
    ...normalize(input),
    id: `c_${randomBytes(5).toString("hex")}`,
    accountId: account.id,
    advertiser: account.companyName,
    status: "draft",
    endReason: null,
    rejectionReason: null,
    budgetCents: 0,
    spentCents: 0,
    impressions: 0,
    clicks: 0,
    approvedContentHash: null,
    createdAt: now(),
    updatedAt: now(),
    endedAt: null,
  };
  await campaigns.update((all) => void all.push(c));
  return c;
}

export async function editCampaign(accountId: string, id: string, input: CampaignContent): Promise<Campaign> {
  return mutate(id, accountId, (c) => {
    if (c.status === "in_review") throw new CampaignError("This ad is being reviewed. Wait for the decision before editing.", 409);
    Object.assign(c, normalize(input));
    // Changing a running ad's creative sends it back to review (paused too, or resume would skip review).
    if ((c.status === "active" || c.status === "paused") && c.approvedContentHash !== contentHash(c)) c.status = "in_review";
    return c;
  });
}

/**
 * Submit a draft/rejected ad, or re-enable an ended one. Charges `addBudgetCents` to the card,
 * then goes live immediately if this exact creative was approved before, otherwise to review.
 */
const launching = new Set<string>();

export async function launch(
  account: AdvertiserAccount,
  id: string,
  opts: { addBudgetCents: number; endDate: string | null },
): Promise<Campaign> {
  // A double-tap must not charge twice.
  if (launching.has(id)) throw new CampaignError("This ad is already being submitted.", 409);
  launching.add(id);
  try {
    return await launchOnce(account, id, opts);
  } finally {
    launching.delete(id);
  }
}

async function launchOnce(
  account: AdvertiserAccount,
  id: string,
  opts: { addBudgetCents: number; endDate: string | null },
): Promise<Campaign> {
  const c = await getForAccount(account.id, id);
  if (!["draft", "rejected", "ended"].includes(c.status)) throw new CampaignError("This ad is already running.", 409);
  assertDates({ startDate: c.startDate, endDate: opts.endDate });
  const remaining = c.budgetCents - c.spentCents;
  if (opts.addBudgetCents < 0 || !Number.isInteger(opts.addBudgetCents)) throw new CampaignError("Invalid budget.");
  if (remaining + opts.addBudgetCents < MIN_BUDGET_CENTS) {
    throw new CampaignError(`The budget must be at least $${(MIN_BUDGET_CENTS / 100).toFixed(0)}.`);
  }

  if (opts.addBudgetCents > 0) {
    const verb = c.status === "ended" ? "Re-enable" : "Launch";
    await chargeBudget(account, c.id, opts.addBudgetCents, `${verb} ad "${c.headline}"`);
  }

  return mutate(id, account.id, (x) => {
    x.budgetCents += opts.addBudgetCents;
    x.endDate = opts.endDate;
    x.endReason = null;
    x.endedAt = null;
    x.rejectionReason = null;
    x.status = x.approvedContentHash === contentHash(x) ? "active" : "in_review";
    return x;
  });
}

export async function setPaused(accountId: string, id: string, paused: boolean) {
  return mutate(id, accountId, (c) => {
    if (paused && c.status !== "active") throw new CampaignError("Only running ads can be paused.", 409);
    if (!paused && c.status !== "paused") throw new CampaignError("Only paused ads can be resumed.", 409);
    c.status = paused ? "paused" : "active";
    return c;
  });
}

/** End an ad early and refund what's left of its budget. */
export async function stopCampaign(accountId: string, id: string) {
  const c = await getForAccount(accountId, id);
  if (!["active", "paused", "in_review"].includes(c.status)) throw new CampaignError("This ad isn't running.", 409);
  const refunded = await refundUnspent(c.id, c.budgetCents - c.spentCents);
  return mutate(id, accountId, (x) => {
    Object.assign(x, { status: "ended", endReason: "stopped", endedAt: now(), budgetCents: x.budgetCents - refunded });
    return { campaign: x, refundedCents: refunded };
  });
}

export async function duplicateCampaign(account: AdvertiserAccount, id: string) {
  const src = await getForAccount(account.id, id);
  const { headline, body, imageUrl, url, ctaLabel, category, destinations, interests } = src;
  return createDraft(account, {
    headline: `${headline} (copy)`.slice(0, 80),
    body,
    imageUrl,
    url,
    ctaLabel,
    category,
    destinations,
    interests,
    startDate: null,
    endDate: null,
  });
}

export async function deleteDraft(accountId: string, id: string) {
  await settleAll();
  await campaigns.update((all) => {
    const i = all.findIndex((c) => c.id === id && c.accountId === accountId);
    if (i < 0) throw new CampaignError("Ad not found.", 404);
    if (all[i].status !== "draft") throw new CampaignError("Only drafts can be deleted. End the ad instead.", 409);
    all.splice(i, 1);
  });
}

// --- Admin -------------------------------------------------------------------

export const listCampaigns = () => settleAll();
export const listInquiries = () => inquiries.read();

export async function createHouseAd(input: CampaignContent & { advertiser: string }): Promise<Campaign> {
  const c: Campaign = {
    ...normalize(input),
    id: `c_${randomBytes(5).toString("hex")}`,
    accountId: null,
    advertiser: input.advertiser,
    status: "active",
    endReason: null,
    rejectionReason: null,
    budgetCents: 0,
    spentCents: 0,
    impressions: 0,
    clicks: 0,
    approvedContentHash: contentHash(input),
    createdAt: now(),
    updatedAt: now(),
    endedAt: null,
  };
  await campaigns.update((all) => void all.push(c));
  return c;
}

export async function reviewCampaign(id: string, decision: { approve: true } | { approve: false; reason: string }) {
  const c = (await settleAll()).find((x) => x.id === id);
  if (!c) throw new CampaignError("Ad not found.", 404);
  if (c.status !== "in_review") throw new CampaignError("This ad isn't awaiting review.", 409);
  if (decision.approve) {
    return mutate(id, undefined, (x) => {
      x.status = "active";
      x.approvedContentHash = contentHash(x);
      return x;
    });
  }
  const refunded = await refundUnspent(c.id, c.budgetCents - c.spentCents);
  return mutate(id, undefined, (x) => {
    Object.assign(x, { status: "rejected", rejectionReason: decision.reason, budgetCents: x.budgetCents - refunded });
    return x;
  });
}

// --- Serving -----------------------------------------------------------------

function matches(c: Campaign, intent: SearchIntent): boolean {
  if (c.status !== "active") return false;
  if (c.startDate && c.startDate > today()) return false;
  const dest = intent.destination?.toLowerCase();
  if (c.destinations.length && (!dest || !c.destinations.includes(dest))) return false;
  if (c.interests.length) {
    const wanted = intent.interests.map((i) => i.toLowerCase());
    if (!c.interests.some((i) => wanted.some((w) => w.includes(i) || i.includes(w)))) return false;
  }
  return true;
}

/** Pick one matching campaign (random rotation) and count the impression. */
export async function pickSponsored(intent: SearchIntent): Promise<SponsoredPlacement | null> {
  const eligible = (await settleAll()).filter((c) => matches(c, intent));
  if (!eligible.length) return null;
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  await campaigns.update((all) => {
    const c = all.find((x) => x.id === chosen.id);
    if (c) c.impressions++;
  });
  return {
    campaignId: chosen.id,
    advertiser: chosen.advertiser,
    headline: chosen.headline,
    body: chosen.body,
    imageUrl: chosen.imageUrl,
    ctaLabel: chosen.ctaLabel,
    clickPath: `/ads/${chosen.id}/click`,
  };
}

/** Count a click, bill it against the budget, and return the destination URL. */
export async function recordClick(id: string): Promise<string | null> {
  return campaigns.update((all) => {
    const c = all.find((x) => x.id === id);
    if (!c) return null;
    if (c.status === "active") {
      c.clicks++;
      if (c.accountId) c.spentCents = Math.min(c.budgetCents, c.spentCents + CPC_CENTS);
      settle(c);
    }
    return c.url; // still redirect clicks on ads that just ended
  });
}

export async function saveInquiry(input: Omit<AdvertiserInquiry, "id" | "createdAt">): Promise<AdvertiserInquiry> {
  const inquiry = { ...input, id: `inq_${randomBytes(5).toString("hex")}`, createdAt: now() };
  await inquiries.update((all) => void all.push(inquiry));
  return inquiry;
}

export { BillingError };
