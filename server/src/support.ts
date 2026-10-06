import { randomBytes } from "node:crypto";
import type { Audience } from "./legal.js";
import { JsonStore } from "./store.js";

export const SUPPORT_TOPICS: Record<Audience, readonly string[]> = {
  traveler: ["Search results", "A tour or booking", "Saved tours", "Report a listing", "Privacy & data", "Something else"],
  advertiser: ["Account & sign-in", "Billing & refunds", "Ad review", "Ad performance", "Targeting", "Something else"],
  partner: ["Integration & API", "Test console", "Approval status", "Listings & licensing", "Payments & tracking", "Something else"],
};

export interface SupportRequest {
  id: string;
  audience: Audience;
  name: string;
  email: string;
  topic: string;
  reference: string | null;
  message: string;
  status: "open" | "closed";
  createdAt: string;
}

const store = new JsonStore<SupportRequest[]>("support-requests.json", () => []);

export async function createSupportRequest(input: Omit<SupportRequest, "id" | "status" | "createdAt">) {
  const request: SupportRequest = {
    ...input,
    id: `SR-${randomBytes(3).toString("hex").toUpperCase()}`,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await store.update((all) => void all.push(request));
  return request;
}

export const listSupportRequests = () => store.read();

export async function setSupportStatus(id: string, status: SupportRequest["status"]) {
  return store.update((all) => {
    const r = all.find((x) => x.id === id);
    if (r) r.status = status;
    return r ?? null;
  });
}
