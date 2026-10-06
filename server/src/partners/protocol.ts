import { createHmac } from "node:crypto";
import { z } from "zod";
import { SearchIntentSchema, type SearchIntent, type Tour } from "../types.js";

/**
 * The TourMatch Partner Protocol: how a tour company plugs its inventory into our search.
 *
 * For each search, we POST a signed JSON request with the parsed SearchIntent to the
 * partner's endpoint. They reply with tours in the PartnerTour shape below.
 */
export const PROTOCOL_VERSION = "2026-09-01";
export const PARTNER_TIMEOUT_MS = 5_000;
export const MAX_TOURS = 50;
export const SIGNATURE_TOLERANCE_SECONDS = 300;

const httpsUrl = z.url().refine((u) => u.startsWith("https://"), "must be an https:// URL");

export const PartnerTourSchema = z.object({
  id: z.string().min(1).max(200).describe("Your stable ID for this tour."),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  bookingUrl: httpsUrl.describe("Where the traveller books. Include your own tracking params."),
  imageUrl: httpsUrl.nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional().describe("Average rating out of 5."),
  reviewCount: z.number().int().min(0).optional(),
  priceFrom: z.number().min(0).nullable().optional().describe("Lowest per-person price."),
  currency: z.string().length(3).default("USD").describe("ISO 4217 code."),
  isFree: z.boolean().optional().describe("Tip-based / free tour."),
  isPrivate: z.boolean().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  guideName: z.string().max(120).nullable().optional(),
  licensedGuide: z
    .boolean()
    .nullable()
    .optional()
    .describe("Only true if the guide holds a license you can evidence on request."),
  languages: z.array(z.string().max(8)).max(20).optional().describe("ISO 639-1 codes."),
  tags: z.array(z.string().max(40)).max(20).optional(),
});
export type PartnerTour = z.infer<typeof PartnerTourSchema>;

export const PartnerResponseSchema = z.object({ tours: z.array(PartnerTourSchema).max(MAX_TOURS) });

export const PartnerRequestSchema = z.object({
  version: z.literal(PROTOCOL_VERSION),
  requestId: z.string(),
  intent: SearchIntentSchema,
  limit: z.number().int(),
});
export type PartnerRequest = z.infer<typeof PartnerRequestSchema>;

/** `sha256=` + hex HMAC-SHA256 of `${timestamp}.${rawBody}`, keyed with the partner secret. */
export function sign(secret: string, timestamp: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function toTour(partnerId: string, partnerName: string, t: PartnerTour): Tour {
  return {
    id: `partner:${partnerId}:${t.id}`,
    providerId: `partner:${partnerId}`,
    providerName: partnerName,
    title: t.title,
    description: t.description,
    imageUrl: t.imageUrl ?? null,
    rating: t.rating ?? null,
    reviewCount: t.reviewCount ?? 0,
    priceFrom: t.isFree ? 0 : (t.priceFrom ?? null),
    currency: t.currency,
    isFree: t.isFree ?? false,
    isPrivate: t.isPrivate ?? null,
    durationMinutes: t.durationMinutes ?? null,
    city: t.city ?? null,
    guideName: t.guideName ?? null,
    licensedGuide: t.licensedGuide ?? null,
    languages: t.languages ?? [],
    tags: t.tags ?? [],
    bookingUrl: t.bookingUrl,
  };
}

export const SAMPLE_INTENT: SearchIntent = {
  destination: "Rome",
  country: "Italy",
  startDate: "2026-10-14",
  endDate: "2026-10-16",
  groupSize: 4,
  budgetPerPerson: 150,
  currency: "EUR",
  interests: ["history", "food"],
  tourStyle: "private",
  licensedOnly: true,
  languages: ["en"],
  maxDurationHours: 4,
  accessibilityNeeds: ["wheelchair"],
  headline: "Private licensed history tour in Rome for 4",
  followUpQuestion: null,
};

const SAMPLE_RESPONSE = {
  tours: [
    {
      id: "rome-vatican-private-001",
      title: "Private Vatican Museums with a licensed art historian",
      description: "Early entry, step-free route, just your group.",
      bookingUrl: "https://example-tours.com/t/rome-vatican-private-001?utm_source=tourmatch",
      imageUrl: "https://example-tours.com/img/vatican.jpg",
      rating: 4.9,
      reviewCount: 356,
      priceFrom: 145,
      currency: "EUR",
      isPrivate: true,
      durationMinutes: 180,
      city: "Rome",
      guideName: "Francesca",
      licensedGuide: true,
      languages: ["en", "it"],
      tags: ["history", "art", "wheelchair"],
    },
  ],
};

/** Machine-readable description of the protocol, served at GET /partners/spec. */
export function protocolSpec() {
  return {
    name: "TourMatch Partner Protocol",
    version: PROTOCOL_VERSION,
    transport: {
      method: "POST",
      contentType: "application/json",
      timeoutMs: PARTNER_TIMEOUT_MS,
      maxTours: MAX_TOURS,
      redirects: "not followed",
      urlRequirements: "https only, public internet address",
    },
    headers: {
      "X-TourMatch-Partner-Id": "Your partner ID.",
      "X-TourMatch-Timestamp": "Unix seconds when we sent the request.",
      "X-TourMatch-Signature": "sha256=<hex HMAC-SHA256 of `${timestamp}.${rawBody}` using your secret>",
      "X-TourMatch-Request-Id": "Unique per request; log it for support.",
    },
    signature: {
      algorithm: "HMAC-SHA256",
      signedPayload: "`${X-TourMatch-Timestamp}.${raw request body}`",
      toleranceSeconds: SIGNATURE_TOLERANCE_SECONDS,
      note: "Verify against the raw bytes before parsing JSON, and compare in constant time.",
    },
    requestExample: {
      version: PROTOCOL_VERSION,
      requestId: "req_7f3c2a9e",
      intent: SAMPLE_INTENT,
      limit: 20,
    } satisfies PartnerRequest,
    responseExample: SAMPLE_RESPONSE,
    jsonSchema: {
      request: z.toJSONSchema(PartnerRequestSchema, { io: "input" }),
      response: z.toJSONSchema(PartnerResponseSchema, { io: "input" }),
    },
    rules: [
      "Return only tours that are bookable for the request; an empty list is a valid answer.",
      "Respond within the timeout. Slow or failing endpoints are skipped for that search.",
      "licensedGuide: true must be verifiable. We audit, and misuse leads to suspension.",
      "bookingUrl is where the traveller goes to book. Add your own tracking parameters.",
    ],
  };
}
