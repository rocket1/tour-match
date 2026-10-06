import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SearchIntentSchema, type RankedTour, type SearchIntent, type Tour } from "./types.js";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = aiEnabled ? new Anthropic() : null;

// Shared request options. Both calls are short, latency-sensitive extraction tasks,
// so effort is low. Server-side fallbacks re-run a refused request on another model.
const common = {
  model: MODEL,
  max_tokens: 4000,
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

const INTENT_SYSTEM = `You turn a traveller's free-text request into search filters for a guided-tour marketplace.
Only fill a field when the request states or clearly implies it; otherwise use null / [] / "any".
Resolve relative dates ("next weekend", "in May") against the date given in the message.
If the destination is missing, set followUpQuestion to one short, friendly question asking where they're headed.`;

export async function parseIntent(prompt: string): Promise<SearchIntent> {
  if (!client) return heuristicIntent(prompt);

  const today = new Date().toISOString().slice(0, 10);
  const res = await client.beta.messages.parse({
    ...common,
    system: INTENT_SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(SearchIntentSchema) },
    messages: [{ role: "user", content: `Today is ${today}.\n\nRequest: ${prompt}` }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    return heuristicIntent(prompt);
  }
  return res.parsed_output;
}

const RankingSchema = z.object({
  summary: z.string().describe("Two sentences max: what you found and the standout pick."),
  ranked: z.array(
    z.object({
      id: z.string(),
      score: z.number().int().describe("0-100 fit to the request."),
      reason: z.string().describe("Why it fits, max 110 chars, second person, no hype."),
    }),
  ),
});

const RANK_SYSTEM = `You rank guided tours for a traveller. Score each tour 0-100 on fit to their request
(interests, style, budget, duration, language, accessibility, licensing). Penalise hard mismatches heavily.
Never claim a guide is licensed unless licensedGuide is true. Omit tours scoring under 25.
Return tours ordered best first.`;

export async function rankTours(
  prompt: string,
  intent: SearchIntent,
  tours: Tour[],
): Promise<{ summary: string; tours: RankedTour[] }> {
  if (!client || tours.length === 0) return heuristicRank(intent, tours);

  const compact = tours.slice(0, 60).map((t) => ({
    id: t.id,
    provider: t.providerName,
    title: t.title,
    description: t.description.slice(0, 280),
    rating: t.rating,
    reviews: t.reviewCount,
    priceFrom: t.isFree ? "free (tips)" : t.priceFrom && `${t.priceFrom} ${t.currency}`,
    private: t.isPrivate,
    minutes: t.durationMinutes,
    licensedGuide: t.licensedGuide,
    languages: t.languages,
    tags: t.tags,
  }));

  const res = await client.beta.messages.parse({
    ...common,
    system: RANK_SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(RankingSchema) },
    messages: [
      {
        role: "user",
        content: `Request: ${prompt}\n\nParsed filters: ${JSON.stringify(intent)}\n\nTours:\n${JSON.stringify(compact)}`,
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) return heuristicRank(intent, tours);

  const byId = new Map(tours.map((t) => [t.id, t]));
  const ranked: RankedTour[] = [];
  for (const r of res.parsed_output.ranked) {
    const tour = byId.get(r.id);
    if (tour) ranked.push({ ...tour, matchScore: r.score, matchReason: r.reason });
  }
  return { summary: res.parsed_output.summary, tours: ranked };
}

// ---------------------------------------------------------------------------
// No-API-key fallbacks so the app is usable in development without Claude.

const KNOWN_CITIES = ["Rome", "Lisbon", "Tokyo", "Paris", "Mexico City", "London", "Barcelona", "Kyoto"];
const INTEREST_WORDS = ["food", "history", "art", "architecture", "nightlife", "wine", "photography", "kids", "hiking"];

function heuristicIntent(prompt: string): SearchIntent {
  const lower = prompt.toLowerCase();
  const destination = KNOWN_CITIES.find((c) => lower.includes(c.toLowerCase())) ?? null;
  return {
    destination,
    country: null,
    startDate: null,
    endDate: null,
    groupSize: null,
    budgetPerPerson: null,
    currency: "USD",
    interests: INTEREST_WORDS.filter((w) => lower.includes(w)),
    tourStyle: lower.includes("private") ? "private" : lower.includes("free") ? "free_walking" : "any",
    licensedOnly: /licen[sc]ed|certified|official/.test(lower),
    languages: [],
    maxDurationHours: null,
    accessibilityNeeds: [],
    headline: prompt.slice(0, 70),
    followUpQuestion: destination ? null : "Where are you headed?",
  };
}

function heuristicRank(intent: SearchIntent, tours: Tour[]) {
  const ranked = tours
    .map((t) => {
      const hay = `${t.title} ${t.description} ${t.tags.join(" ")}`.toLowerCase();
      const hits = intent.interests.filter((i) => hay.includes(i.toLowerCase())).length;
      const score = Math.min(100, 40 + hits * 20 + (t.rating ?? 0) * 4);
      return { ...t, matchScore: Math.round(score), matchReason: hits ? `Matches ${hits} of your interests` : "Highly rated in this area" };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
  return { summary: `${ranked.length} tours found.`, tours: ranked };
}
