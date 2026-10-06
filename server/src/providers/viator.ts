import type { SearchIntent, Tour } from "../types.js";
import type { ApiProvider } from "./types.js";

// Viator Partner API v2, Basic-access affiliate tier.
// Docs: https://docs.viator.com/partner-api/affiliate/technical/
const BASE = process.env.VIATOR_BASE_URL ?? "https://api.viator.com/partner";

function headers() {
  return {
    "exp-api-key": process.env.VIATOR_API_KEY ?? "",
    Accept: "application/json;version=2.0",
    "Accept-Language": "en-US",
    "Content-Type": "application/json",
  };
}

interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
}
let destinationCache: ViatorDestination[] | null = null;

async function findDestinationId(name: string): Promise<number | null> {
  if (!destinationCache) {
    const res = await fetch(`${BASE}/destinations`, { headers: headers() });
    if (!res.ok) throw new Error(`Viator destinations ${res.status}`);
    const body = (await res.json()) as { destinations: ViatorDestination[] };
    destinationCache = body.destinations;
  }
  const target = name.trim().toLowerCase();
  const matches = destinationCache.filter((d) => d.name.toLowerCase() === target);
  const best = matches.find((d) => d.type === "CITY") ?? matches[0];
  return best?.destinationId ?? null;
}

interface ViatorProduct {
  productCode: string;
  title: string;
  description?: string;
  images?: { variants: { url: string; width: number }[] }[];
  reviews?: { totalReviews: number; combinedAverageRating: number };
  duration?: { fixedDurationInMinutes?: number; variableDurationFromMinutes?: number };
  pricing?: { summary?: { fromPrice?: number }; currency?: string };
  productUrl: string;
  flags?: string[];
}

function pickImage(p: ViatorProduct): string | null {
  const variants = p.images?.[0]?.variants ?? [];
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  return (sorted.find((v) => v.width >= 600) ?? sorted.at(-1))?.url ?? null;
}

export const viator: ApiProvider = {
  id: "viator",
  name: "Viator",
  mode: "api",
  enabled: () => Boolean(process.env.VIATOR_API_KEY),

  async search(intent: SearchIntent): Promise<Tour[]> {
    if (!intent.destination) return [];
    const destinationId = await findDestinationId(intent.destination);
    if (!destinationId) return [];

    const filtering: Record<string, unknown> = { destination: String(destinationId) };
    if (intent.startDate) filtering.startDate = intent.startDate;
    if (intent.endDate) filtering.endDate = intent.endDate;
    if (intent.budgetPerPerson) filtering.highestPrice = intent.budgetPerPerson;
    if (intent.maxDurationHours) filtering.durationInMinutes = { from: 0, to: intent.maxDurationHours * 60 };
    if (intent.tourStyle === "private") filtering.flags = ["PRIVATE_TOUR"];

    const res = await fetch(`${BASE}/products/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        filtering,
        sorting: { sort: "TRAVELER_RATING", order: "DESCENDING" },
        pagination: { start: 1, count: 30 },
        currency: intent.currency || "USD",
      }),
    });
    if (!res.ok) throw new Error(`Viator search ${res.status}`);
    const body = (await res.json()) as { products?: ViatorProduct[] };

    return (body.products ?? []).map((p) => ({
      id: `viator:${p.productCode}`,
      providerId: "viator",
      providerName: "Viator",
      title: p.title,
      description: p.description ?? "",
      imageUrl: pickImage(p),
      rating: p.reviews?.combinedAverageRating ?? null,
      reviewCount: p.reviews?.totalReviews ?? 0,
      priceFrom: p.pricing?.summary?.fromPrice ?? null,
      currency: p.pricing?.currency ?? intent.currency,
      isFree: false,
      isPrivate: p.flags?.includes("PRIVATE_TOUR") ?? null,
      durationMinutes: p.duration?.fixedDurationInMinutes ?? p.duration?.variableDurationFromMinutes ?? null,
      city: intent.destination,
      guideName: null,
      licensedGuide: null,
      languages: [],
      tags: p.flags ?? [],
      bookingUrl: p.productUrl,
    }));
  },
};
