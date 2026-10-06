import { Hono } from "hono";
import { z } from "zod";
import { recordClick, saveInquiry } from "../ads.js";
import { rateLimit } from "../rateLimit.js";

export const advertiserRoutes = new Hono();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional()
    .transform((s) => s ?? null);

const InquiryBody = z.object({
  company: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.email(),
  website: optionalText(300),
  markets: optionalText(300),
  monthlyBudget: optionalText(60),
  message: optionalText(2000),
});

advertiserRoutes.post("/advertisers/inquiries", rateLimit({ limit: 5, windowMs: 60 * 60_000 }), async (c) => {
  const parsed = InquiryBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    for (const i of parsed.error.issues) issues[String(i.path[0] ?? "form")] ??= i.message;
    return c.json({ error: "Check the form fields.", issues }, 400);
  }
  const inquiry = await saveInquiry(parsed.data);
  console.log(`[advertisers] new inquiry ${inquiry.id} from ${inquiry.company}`);
  return c.json({ id: inquiry.id }, 201);
});

advertiserRoutes.get("/ads/:id/click", async (c) => {
  const url = await recordClick(c.req.param("id"));
  if (!url) return c.text("Not found", 404);
  return c.redirect(url, 302);
});
