/**
 * Reference implementation of a TourMatch partner endpoint.
 *
 * A tour company runs something like this in front of its own inventory/booking API.
 * TourMatch POSTs a signed search request; you verify it, query your system,
 * and map results to the TourMatch tour shape.
 *
 *   TOURMATCH_SECRET=tmsk_... npm run example:partner   # listens on :8790
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const SECRET = process.env.TOURMATCH_SECRET ?? "";
const TOLERANCE_SECONDS = 300;

// Stand-in for your real inventory. Replace with a call to your booking system.
const INVENTORY = [
  {
    sku: "ROM-VAT-PRV",
    city: "Rome",
    name: "Private Vatican Museums with a licensed art historian",
    summary: "Early entry, step-free route, just your group.",
    fromPrice: 145,
    currency: "EUR",
    minutes: 180,
    private: true,
    guide: { name: "Francesca", licensed: true },
    languages: ["en", "it"],
    tags: ["history", "art", "wheelchair"],
    rating: 4.9,
    reviews: 356,
  },
  {
    sku: "ROM-FOOD-GRP",
    city: "Rome",
    name: "Testaccio market food walk",
    summary: "Ten tastings in Rome's food neighbourhood.",
    fromPrice: 79,
    currency: "EUR",
    minutes: 210,
    private: false,
    guide: { name: "Luca", licensed: false },
    languages: ["en"],
    tags: ["food", "small group"],
    rating: 4.8,
    reviews: 1204,
  },
];

function verify(rawBody: string, timestamp: string | undefined, signature: string | undefined): boolean {
  if (!SECRET || !timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false; // replay protection
  const expected = "sha256=" + createHmac("sha256", SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const app = new Hono();

app.post("/tourmatch/search", async (c) => {
  const raw = await c.req.text(); // verify the raw bytes before parsing
  if (!verify(raw, c.req.header("x-tourmatch-timestamp"), c.req.header("x-tourmatch-signature"))) {
    return c.json({ error: "bad signature" }, 401);
  }

  const { intent, limit } = JSON.parse(raw);
  const city = String(intent.destination ?? "").toLowerCase();

  const matches = INVENTORY.filter((t) => t.city.toLowerCase() === city)
    .filter((t) => intent.tourStyle !== "private" || t.private)
    .filter((t) => !intent.licensedOnly || t.guide.licensed)
    .filter((t) => !intent.budgetPerPerson || t.fromPrice <= intent.budgetPerPerson)
    .slice(0, limit);

  return c.json({
    tours: matches.map((t) => ({
      id: t.sku,
      title: t.name,
      description: t.summary,
      bookingUrl: `https://example-tours.com/book/${t.sku}?utm_source=tourmatch`,
      priceFrom: t.fromPrice,
      currency: t.currency,
      durationMinutes: t.minutes,
      isPrivate: t.private,
      city: t.city,
      guideName: t.guide.name,
      licensedGuide: t.guide.licensed,
      languages: t.languages,
      tags: t.tags,
      rating: t.rating,
      reviewCount: t.reviews,
    })),
  });
});

const port = Number(process.env.PORT ?? 8790);
serve({ fetch: app.fetch, port }, () => console.log(`example partner endpoint on http://localhost:${port}/tourmatch/search`));
