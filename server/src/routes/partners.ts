import { Hono, type Context } from "hono";
import { z } from "zod";
import { callPartner, toTestResult, validateEndpointUrl } from "../partners/client.js";
import { protocolSpec, SAMPLE_INTENT } from "../partners/protocol.js";
import {
  authenticatePartner,
  registerPartner,
  rotateSecret,
  toPublic,
  updatePartner,
  type Partner,
} from "../partners/registry.js";
import { TERMS_VERSIONS } from "../legal.js";
import { rateLimit } from "../rateLimit.js";

type Env = { Variables: { partner: Partner } };
export const partnerRoutes = new Hono<Env>();

partnerRoutes.get("/spec", (c) => c.json(protocolSpec()));

const RegisterBody = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactEmail: z.email(),
  website: z.url().max(300).nullable().optional(),
  endpointUrl: z.string().trim().max(500),
  termsVersion: z.string(),
  acceptTerms: z.literal(true, "You need to accept the Partner Terms."),
});

partnerRoutes.post("/providers", rateLimit({ limit: 5, windowMs: 60 * 60_000 }), async (c) => {
  const parsed = RegisterBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Check the form fields.", issues: fieldIssues(parsed.error) }, 400);
  if (parsed.data.termsVersion !== TERMS_VERSIONS.partner) {
    return c.json({ error: "The Partner Terms have been updated. Reload and review them again." }, 409);
  }
  const urlError = validateEndpointUrl(parsed.data.endpointUrl);
  if (urlError) return c.json({ error: urlError, issues: { endpointUrl: urlError } }, 400);

  const { acceptTerms: _accepted, ...input } = parsed.data;
  const partner = await registerPartner({ ...input, website: input.website ?? null });
  // The secret is only ever returned here and on rotation.
  return c.json({ partner: toPublic(partner), secret: partner.secret }, 201);
});

// Everything below needs the partner's credentials.
const auth = async (c: Context<Env>, next: () => Promise<void>) => {
  const bearer = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const partner = await authenticatePartner(c.req.header("x-tourmatch-partner-id"), bearer);
  if (!partner) return c.json({ error: "Invalid partner ID or secret." }, 401);
  c.set("partner", partner);
  await next();
};

partnerRoutes.get("/providers/me", auth, (c) => c.json({ partner: toPublic(c.get("partner")) }));

partnerRoutes.patch("/providers/me", auth, async (c) => {
  const body = z.object({ endpointUrl: z.string().trim().max(500) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Send { endpointUrl }" }, 400);
  const urlError = validateEndpointUrl(body.data.endpointUrl);
  if (urlError) return c.json({ error: urlError }, 400);
  const updated = await updatePartner(c.get("partner").id, { endpointUrl: body.data.endpointUrl, lastTest: null });
  return c.json({ partner: toPublic(updated!) });
});

partnerRoutes.post("/providers/me/rotate-secret", auth, async (c) => {
  const secret = await rotateSecret(c.get("partner").id);
  return c.json({ secret });
});

/** Send a signed sample search to the partner's endpoint and report what we saw. */
partnerRoutes.post(
  "/providers/me/test",
  auth,
  rateLimit({ limit: 10, windowMs: 60_000, key: (c) => `test:${c.req.header("x-tourmatch-partner-id")}` }),
  async (c) => {
    const partner = c.get("partner");
    const result = await callPartner(partner, SAMPLE_INTENT, 5);
    const lastTest = toTestResult(result);
    await updatePartner(partner.id, { lastTest });
    return c.json({ result: lastTest, sampleTours: result.tours.slice(0, 3), requestIntent: SAMPLE_INTENT });
  },
);

function fieldIssues(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}
