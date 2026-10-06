// Mirrors server/src/types.ts. Keep the two in sync.

export type ProviderId = "guruwalk" | "viator" | "toursbylocals" | "withlocals" | "showaround" | "demo" | `partner:${string}`;

export interface SponsoredPlacement {
  campaignId: string;
  advertiser: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string;
  clickPath: string;
}

export interface EndpointTestResult {
  at: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  tourCount: number;
  errors: string[];
}

export interface PartnerAccount {
  id: string;
  companyName: string;
  contactEmail: string;
  website: string | null;
  endpointUrl: string;
  status: "pending" | "approved" | "suspended";
  createdAt: string;
  lastTest: EndpointTestResult | null;
}

export interface SearchIntent {
  destination: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  groupSize: number | null;
  budgetPerPerson: number | null;
  currency: string;
  interests: string[];
  tourStyle: "private" | "small_group" | "free_walking" | "any";
  licensedOnly: boolean;
  languages: string[];
  maxDurationHours: number | null;
  accessibilityNeeds: string[];
  headline: string;
  followUpQuestion: string | null;
}

export interface Tour {
  id: string;
  providerId: ProviderId;
  providerName: string;
  title: string;
  description: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  priceFrom: number | null;
  currency: string;
  isFree: boolean;
  isPrivate: boolean | null;
  durationMinutes: number | null;
  city: string | null;
  guideName: string | null;
  licensedGuide: boolean | null;
  languages: string[];
  tags: string[];
  bookingUrl: string;
  isDemo?: boolean;
}

export interface RankedTour extends Tour {
  matchScore: number;
  matchReason: string;
}

export interface ProviderLink {
  providerId: ProviderId;
  providerName: string;
  url: string;
  blurb: string;
}

export interface ProviderStatus {
  providerId: ProviderId;
  providerName: string;
  mode: "api" | "link" | "demo";
  enabled: boolean;
  resultCount?: number;
  error?: string;
}

export interface SearchResponse {
  intent: SearchIntent;
  summary: string;
  tours: RankedTour[];
  links: ProviderLink[];
  providers: ProviderStatus[];
  sponsored: SponsoredPlacement | null;
  aiUsed: boolean;
}

// --- Advertisers ---------------------------------------------------------------

export type AdCategory =
  "attractions" | "tours" | "food_drink" | "transport" | "accommodation" | "events" | "shopping" | "services";
export type CampaignStatus = "draft" | "in_review" | "active" | "paused" | "rejected" | "ended";
export type EndReason = "completed" | "budget_spent" | "stopped";

export interface CampaignContent {
  headline: string;
  body: string;
  imageUrl: string | null;
  url: string;
  ctaLabel: string;
  category: AdCategory;
  destinations: string[];
  interests: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface Campaign extends CampaignContent {
  id: string;
  advertiser: string;
  status: CampaignStatus;
  endReason: EndReason | null;
  rejectionReason: string | null;
  budgetCents: number;
  spentCents: number;
  impressions: number;
  clicks: number;
  approvedContentHash: string | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}

export interface SavedCard {
  paymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface AdvertiserAccount {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  website: string | null;
  termsVersion: string;
  termsAcceptedAt: string;
  card: SavedCard | null;
  createdAt: string;
}

export interface Charge {
  id: string;
  campaignId: string;
  amountCents: number;
  refundedCents: number;
  currency: string;
  status: "succeeded" | "refunded" | "partially_refunded" | "not_billed";
  description: string;
  createdAt: string;
}

export interface AdvertiserConfig {
  billingEnabled: boolean;
  stripePublishableKey: string | null;
  currency: string;
  cpcCents: number;
  minBudgetCents: number;
  categories: AdCategory[];
  termsVersion: string;
}

export type Audience = "traveler" | "advertiser" | "partner";
