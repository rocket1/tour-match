import { Hono } from "hono";
import { z } from "zod";
import { AUDIENCES, TERMS_VERSIONS, type Audience } from "../legal.js";
import { rateLimit } from "../rateLimit.js";
import { createSupportRequest, SUPPORT_TOPICS } from "../support.js";

export const supportRoutes = new Hono();

supportRoutes.get("/legal/versions", (c) => c.json(TERMS_VERSIONS));

supportRoutes.get("/support/topics", (c) => c.json(SUPPORT_TOPICS));

const SupportBody = z
  .object({
    audience: z.enum(AUDIENCES as [Audience, ...Audience[]]),
    name: z.string().trim().min(2, "Tell us your name.").max(120),
    email: z.email("Enter a valid email so we can reply."),
    topic: z.string(),
    reference: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .transform((s) => s || null),
    message: z.string().trim().min(20, "Add a bit more detail (at least 20 characters).").max(5000),
  })
  .refine((b) => SUPPORT_TOPICS[b.audience].includes(b.topic), { path: ["topic"], message: "Pick a topic." });

supportRoutes.post("/support/requests", rateLimit({ limit: 5, windowMs: 60 * 60_000 }), async (c) => {
  const parsed = SupportBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    for (const i of parsed.error.issues) issues[String(i.path[0] ?? "form")] ??= i.message;
    return c.json({ error: "Check the form fields.", issues }, 400);
  }
  const request = await createSupportRequest(parsed.data);
  console.log(`[support] ${request.id} (${request.audience}/${request.topic}) from ${request.email}`);
  return c.json({ ticketId: request.id }, 201);
});
