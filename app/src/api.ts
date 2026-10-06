import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Audience, EndpointTestResult, PartnerAccount, ProviderStatus, RankedTour, SearchResponse, Tour } from "./types";

/**
 * The backend holds all API keys; the app never talks to Claude or providers directly.
 * Set EXPO_PUBLIC_API_URL in production. In development we reuse the Metro host so a
 * physical device on the same Wi-Fi reaches the server running on your laptop.
 */
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:8787`;
  return Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";
}

export const API_URL = resolveBaseUrl();

// Tours from recent searches, so detail screens can render without a refetch.
const tourCache = new Map<string, RankedTour>();
export const getCachedTour = (id: string) => tourCache.get(id);

export async function searchTours(prompt: string, signal?: AbortSignal): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Server error ${res.status}`);
  const data = body as SearchResponse;
  data.tours.forEach((t) => tourCache.set(t.id, t));
  return data;
}

export async function fetchProviders(): Promise<{ aiEnabled: boolean; providers: ProviderStatus[] }> {
  const res = await fetch(`${API_URL}/providers`);
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

// --- Business: advertisers & tour-company partners ---------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}.`, 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Server error ${res.status}`, res.status, body.issues);
  return body as T;
}

export interface AdInquiry {
  company: string;
  contactName: string;
  email: string;
  website?: string;
  markets?: string;
  monthlyBudget?: string;
  message?: string;
}

export const submitAdInquiry = (inquiry: AdInquiry) =>
  request<{ id: string }>("/advertisers/inquiries", { method: "POST", body: JSON.stringify(inquiry) });

export const sponsoredClickUrl = (clickPath: string) => `${API_URL}${clickPath}`;

export interface PartnerCredentials {
  partnerId: string;
  secret: string;
}

const partnerHeaders = (c: PartnerCredentials) => ({
  "X-TourMatch-Partner-Id": c.partnerId,
  Authorization: `Bearer ${c.secret}`,
});

export async function registerPartner(input: {
  companyName: string;
  contactEmail: string;
  website?: string | null;
  endpointUrl: string;
  termsVersion: string;
  acceptTerms: boolean;
}): Promise<{ partner: PartnerAccount; secret: string }> {
  return request("/partners/providers", { method: "POST", body: JSON.stringify(input) });
}

export const fetchPartner = (c: PartnerCredentials) =>
  request<{ partner: PartnerAccount }>("/partners/providers/me", { headers: partnerHeaders(c) });

export const updatePartnerEndpoint = (c: PartnerCredentials, endpointUrl: string) =>
  request<{ partner: PartnerAccount }>("/partners/providers/me", {
    method: "PATCH",
    headers: partnerHeaders(c),
    body: JSON.stringify({ endpointUrl }),
  });

export const testPartnerEndpoint = (c: PartnerCredentials) =>
  request<{ result: EndpointTestResult; sampleTours: Tour[] }>("/partners/providers/me/test", {
    method: "POST",
    headers: partnerHeaders(c),
  });

export const partnerSpecUrl = () => `${API_URL}/partners/spec`;

// --- Support -------------------------------------------------------------------

export const fetchSupportTopics = () => request<Record<Audience, string[]>>("/support/topics");

export const submitSupportRequest = (input: {
  audience: Audience;
  name: string;
  email: string;
  topic: string;
  reference?: string;
  message: string;
}) => request<{ ticketId: string }>("/support/requests", { method: "POST", body: JSON.stringify(input) });
