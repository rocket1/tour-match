import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { aiEnabled, parseIntent, rankTours } from "./ai.js";
import { demo } from "./providers/demo.js";
import { guruwalk } from "./providers/guruwalk.js";
import { linkProviders } from "./providers/links.js";
import { partnerProviders } from "./providers/partners.js";
import type { ApiProvider } from "./providers/types.js";
import { viator } from "./providers/viator.js";
import { pickSponsored } from "./ads.js";
import { billingEnabled } from "./advertisers/billing.js";
import { adminRoutes } from "./routes/admin.js";
import { advertiserAccountRoutes } from "./routes/advertiserAccount.js";
import { supportRoutes } from "./routes/support.js";
import { advertiserRoutes } from "./routes/advertisers.js";
import { partnerRoutes } from "./routes/partners.js";
import type { ProviderStatus, SearchResponse, Tour } from "./types.js";

// Built-in integrations plus every approved partner, resolved per request so newly
// approved partners show up without a restart. Demo stays last.
async function apiProviders(): Promise<ApiProvider[]> {
  return [guruwalk, viator, ...(await partnerProviders()), demo];
}
const PROVIDER_TIMEOUT_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);
}

function providerStatuses(apis: ApiProvider[]): ProviderStatus[] {
  return [
    ...apis.map((p) => ({ providerId: p.id, providerName: p.name, mode: p.mode, enabled: p.enabled() })),
    ...linkProviders.map((p) => ({ providerId: p.id, providerName: p.name, mode: p.mode, enabled: true })),
  ];
}

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, aiEnabled }));
app.get("/providers", async (c) => c.json({ aiEnabled, providers: providerStatuses(await apiProviders()) }));
app.route("/partners", partnerRoutes);
app.route("/", advertiserRoutes);
app.route("/advertisers", advertiserAccountRoutes);
app.route("/", supportRoutes);
app.route("/admin", adminRoutes);

const SearchBody = z.object({ prompt: z.string().trim().min(2).max(1000) });

app.post("/search", async (c) => {
  const parsed = SearchBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Send { prompt: string }" }, 400);
  const { prompt } = parsed.data;

  try {
    const intent = await parseIntent(prompt);
    const apis = await apiProviders();
    const statuses = providerStatuses(apis);

    // Fan out to every configured provider in parallel; one failure shouldn't sink the search.
    const active = apis.filter((p) => p.enabled());
    const settled = await Promise.allSettled(active.map((p) => withTimeout(p.search(intent), PROVIDER_TIMEOUT_MS)));
    let tours: Tour[] = [];
    settled.forEach((r, i) => {
      const status = statuses.find((s) => s.providerId === active[i].id)!;
      if (r.status === "fulfilled") {
        status.resultCount = r.value.length;
        tours.push(...r.value);
      } else {
        status.error = String(r.reason?.message ?? r.reason);
        console.warn(`[${active[i].id}]`, status.error);
      }
    });

    // Hide the sample catalog once real providers return results.
    if (tours.some((t) => !t.isDemo)) tours = tours.filter((t) => !t.isDemo);
    // Respect an explicit licensing requirement; keep "unknown" so the user can check.
    if (intent.licensedOnly) tours = tours.filter((t) => t.licensedGuide !== false);

    const [ranked, sponsored] = await Promise.all([rankTours(prompt, intent, tours), pickSponsored(intent)]);
    const links = linkProviders.flatMap((p) => p.link(intent) ?? []);

    const body: SearchResponse = {
      intent,
      summary: ranked.summary,
      tours: ranked.tours,
      links,
      providers: statuses,
      sponsored,
      aiUsed: aiEnabled,
    };
    return c.json(body);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Search failed. Try again in a moment." }, 500);
  }
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`tour-match server on http://localhost:${port} (AI ${aiEnabled ? "on" : "off: heuristic mode"}, billing ${billingEnabled ? "on" : "off"})`);
});
