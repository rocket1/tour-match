import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { AD_CATEGORIES, CampaignError, createHouseAd, listCampaigns, listInquiries, reviewCampaign } from "../ads.js";
import { listPartners, toPublic, updatePartner } from "../partners/registry.js";
import { listSupportRequests, setSupportStatus } from "../support.js";

// Internal back-office API. Disabled unless ADMIN_TOKEN is set.
export const adminRoutes = new Hono();

adminRoutes.use("*", async (c, next) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return c.notFound();
  const given = Buffer.from(c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(token);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return c.json({ error: "Unauthorized" }, 401);
  await next();
});

adminRoutes.onError((err, c) => {
  if (err instanceof CampaignError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: String(err) }, 500);
});

// Partners

adminRoutes.get("/partners", async (c) => c.json({ partners: (await listPartners()).map(toPublic) }));

adminRoutes.post("/partners/:id/status", async (c) => {
  const body = z.object({ status: z.enum(["pending", "approved", "suspended"]) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Send { status: pending | approved | suspended }" }, 400);
  const p = await updatePartner(c.req.param("id"), { status: body.data.status });
  return p ? c.json({ partner: toPublic(p) }) : c.notFound();
});

// Advertising

adminRoutes.get("/inquiries", async (c) => c.json({ inquiries: await listInquiries() }));

adminRoutes.get("/campaigns", async (c) => {
  const status = c.req.query("status");
  const all = await listCampaigns();
  return c.json({ campaigns: status ? all.filter((x) => x.status === status) : all });
});

adminRoutes.post("/campaigns/:id/review", async (c) => {
  const body = z
    .union([z.object({ approve: z.literal(true) }), z.object({ approve: z.literal(false), reason: z.string().min(5).max(500) })])
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: 'Send { approve: true } or { approve: false, reason: "..." }' }, 400);
  return c.json({ campaign: await reviewCampaign(c.req.param("id"), body.data) });
});

// Unbilled "house" ads, e.g. promoting TourMatch's own features.
const HouseAd = z.object({
  advertiser: z.string().min(1).max(120),
  headline: z.string().min(1).max(80),
  body: z.string().max(200).default(""),
  imageUrl: z.url().nullable().default(null),
  url: z.url().refine((u) => u.startsWith("https://"), "must be https"),
  ctaLabel: z.string().max(30).default("Learn more"),
  category: z.enum(AD_CATEGORIES).default("services"),
  destinations: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
});

adminRoutes.post("/campaigns", async (c) => {
  const body = HouseAd.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: z.prettifyError(body.error) }, 400);
  return c.json({ campaign: await createHouseAd(body.data) }, 201);
});

// Support

adminRoutes.get("/support", async (c) => {
  const audience = c.req.query("audience");
  const all = await listSupportRequests();
  return c.json({ requests: audience ? all.filter((r) => r.audience === audience) : all });
});

adminRoutes.post("/support/:id/status", async (c) => {
  const body = z.object({ status: z.enum(["open", "closed"]) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Send { status: open | closed }" }, 400);
  const r = await setSupportStatus(c.req.param("id"), body.data.status);
  return r ? c.json({ request: r }) : c.notFound();
});
