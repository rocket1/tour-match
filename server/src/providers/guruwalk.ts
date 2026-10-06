import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { SearchIntent, Tour } from "../types.js";
import type { ApiProvider } from "./types.js";

// GuruWalk's affiliate catalog is exposed as a stateless MCP server.
// Docs: https://github.com/guruwalk/affiliates-mcp
const ENDPOINT = "https://back.guruwalk.com/mcp/affiliates";
const SUPPORTED_LANGS = ["en", "es", "de", "it"];

interface GuruProduct {
  id: number;
  name: string;
  slug: string;
  rating_out_of_5: number | null;
  reviews_count: number;
  image_url: string | null;
  url: string;
}
interface DiscoverResult {
  place?: { name: string; country: string };
  categories?: { id: number; name: string }[];
  featured_products?: GuruProduct[];
}

async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    requestInit: { headers: { Authorization: `Bearer ${process.env.GURUWALK_API_KEY}` } },
  });
  const client = new Client({ name: "tour-match", version: "0.1.0" });
  await client.connect(transport);
  try {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) throw new Error(`GuruWalk ${name} failed`);
    if (result.structuredContent) return result.structuredContent as T;
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === "text")?.text;
    if (!text) throw new Error(`GuruWalk ${name} returned no content`);
    return JSON.parse(text) as T;
  } finally {
    await client.close();
  }
}

export const guruwalk: ApiProvider = {
  id: "guruwalk",
  name: "GuruWalk",
  mode: "api",
  enabled: () => Boolean(process.env.GURUWALK_API_KEY),

  async search(intent: SearchIntent): Promise<Tour[]> {
    if (!intent.destination) return [];
    // GuruWalk only lists tip-based group walks, so skip it for private-only requests.
    if (intent.tourStyle === "private") return [];

    const language = intent.languages.find((l) => SUPPORTED_LANGS.includes(l)) ?? "en";
    const data = await callTool<DiscoverResult>("discover_destination", {
      destination: intent.destination,
      language,
      ...(intent.startDate && { start_date: intent.startDate }),
      ...(intent.endDate && { end_date: intent.endDate }),
    });

    return (data.featured_products ?? []).map((p) => ({
      id: `guruwalk:${p.id}`,
      providerId: "guruwalk",
      providerName: "GuruWalk",
      title: p.name,
      description: `Free walking tour in ${data.place?.name ?? intent.destination}. Pay what you think it's worth at the end.`,
      imageUrl: p.image_url,
      rating: p.rating_out_of_5,
      reviewCount: p.reviews_count ?? 0,
      priceFrom: 0,
      currency: intent.currency,
      isFree: true,
      isPrivate: false,
      durationMinutes: null,
      city: data.place?.name ?? intent.destination,
      guideName: null,
      licensedGuide: null,
      languages: [language],
      tags: ["walking", "free tour"],
      bookingUrl: p.url,
    }));
  },
};
