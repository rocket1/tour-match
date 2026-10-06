import { randomBytes, timingSafeEqual } from "node:crypto";
import { JsonStore } from "../store.js";

export type PartnerStatus = "pending" | "approved" | "suspended";

export interface EndpointTestResult {
  at: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  tourCount: number;
  errors: string[];
}

export interface Partner {
  id: string;
  companyName: string;
  contactEmail: string;
  website: string | null;
  endpointUrl: string;
  /** HMAC signing key, also used as the partner's API bearer token. */
  secret: string;
  status: PartnerStatus;
  termsVersion: string;
  termsAcceptedAt: string;
  createdAt: string;
  lastTest: EndpointTestResult | null;
}

export type PublicPartner = Omit<Partner, "secret">;

const store = new JsonStore<Partner[]>("partners.json", () => []);

export const toPublic = ({ secret: _secret, ...p }: Partner): PublicPartner => p;

export async function registerPartner(input: {
  companyName: string;
  contactEmail: string;
  website: string | null;
  endpointUrl: string;
  termsVersion: string;
}): Promise<Partner> {
  const partner: Partner = {
    ...input,
    termsAcceptedAt: new Date().toISOString(),
    id: `p_${randomBytes(5).toString("hex")}`,
    secret: `tmsk_${randomBytes(24).toString("base64url")}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    lastTest: null,
  };
  await store.update((all) => void all.push(partner));
  return partner;
}

export async function authenticatePartner(id: string | undefined, bearer: string | undefined): Promise<Partner | null> {
  if (!id || !bearer) return null;
  const partner = (await store.read()).find((p) => p.id === id);
  if (!partner) return null;
  const a = Buffer.from(partner.secret);
  const b = Buffer.from(bearer);
  return a.length === b.length && timingSafeEqual(a, b) ? partner : null;
}

export async function listPartners(): Promise<Partner[]> {
  return store.read();
}

export async function approvedPartners(): Promise<Partner[]> {
  return (await store.read()).filter((p) => p.status === "approved");
}

export async function updatePartner(id: string, patch: Partial<Pick<Partner, "endpointUrl" | "status" | "lastTest">>) {
  return store.update((all) => {
    const p = all.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p ?? null;
  });
}

export async function rotateSecret(id: string): Promise<string | null> {
  const secret = `tmsk_${randomBytes(24).toString("base64url")}`;
  const p = await updatePartnerRaw(id, (x) => (x.secret = secret));
  return p ? secret : null;
}

async function updatePartnerRaw(id: string, fn: (p: Partner) => void) {
  return store.update((all) => {
    const p = all.find((x) => x.id === id);
    if (p) fn(p);
    return p ?? null;
  });
}
