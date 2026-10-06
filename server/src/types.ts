import { z } from "zod";

/** Structured search filters that Claude extracts from a free-text request. */
export const SearchIntentSchema = z.object({
  destination: z
    .string()
    .nullable()
    .describe("City or region to search, in English, e.g. 'Rome'. Null if the user did not name one."),
  country: z.string().nullable().describe("Country of the destination, if known."),
  startDate: z.string().nullable().describe("First day of the trip as YYYY-MM-DD, or null."),
  endDate: z.string().nullable().describe("Last day of the trip as YYYY-MM-DD, or null."),
  groupSize: z.number().int().nullable().describe("Number of travellers, or null."),
  budgetPerPerson: z.number().nullable().describe("Max spend per person in `currency`, or null."),
  currency: z.string().describe("ISO 4217 currency code; default USD."),
  interests: z.array(z.string()).describe("Short themes like 'food', 'history', 'street art', 'kid-friendly'."),
  tourStyle: z
    .enum(["private", "small_group", "free_walking", "any"])
    .describe("private = just their party; free_walking = tip-based walking tours."),
  licensedOnly: z.boolean().describe("True if the user asked for licensed/certified/official guides."),
  languages: z.array(z.string()).describe("ISO 639-1 codes of languages the guide should speak."),
  maxDurationHours: z.number().nullable().describe("Upper bound on tour length in hours, or null."),
  accessibilityNeeds: z.array(z.string()).describe("e.g. 'wheelchair', 'limited walking', 'stroller'."),
  headline: z.string().describe("A friendly one-line restatement of what they want, max 70 chars."),
  followUpQuestion: z
    .string()
    .nullable()
    .describe("One short question to ask if a key detail (usually destination) is missing, else null."),
});
export type SearchIntent = z.infer<typeof SearchIntentSchema>;

/** A tour normalized across every provider. */
export interface Tour {
  id: string; // `${providerId}:${nativeId}`
  providerId: ProviderId;
  providerName: string;
  title: string;
  description: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  priceFrom: number | null; // per person
  currency: string;
  isFree: boolean; // tip-based
  isPrivate: boolean | null;
  durationMinutes: number | null;
  city: string | null;
  guideName: string | null;
  /** true/false only when the provider tells us; null = unknown. */
  licensedGuide: boolean | null;
  languages: string[];
  tags: string[];
  bookingUrl: string;
  isDemo?: boolean;
}

export interface RankedTour extends Tour {
  matchScore: number; // 0-100
  matchReason: string;
}

/** Providers without a public search API: we hand the user a deep link instead. */
export interface ProviderLink {
  providerId: ProviderId;
  providerName: string;
  url: string;
  blurb: string;
}

export type ProviderId =
  | "guruwalk"
  | "viator"
  | "toursbylocals"
  | "withlocals"
  | "showaround"
  | "demo"
  | `partner:${string}`; // tour companies connected through the Partner Protocol

/** A paid placement shown alongside organic results. */
export interface SponsoredPlacement {
  campaignId: string;
  advertiser: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string;
  /** Relative to the API base URL; records the click, then redirects. */
  clickPath: string;
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
