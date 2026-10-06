import { randomBytes } from "node:crypto";
import dns from "node:dns";
import net, { type LookupFunction } from "node:net";
import { Agent, fetch } from "undici";
import type { SearchIntent, Tour } from "../types.js";
import {
  MAX_TOURS,
  PARTNER_TIMEOUT_MS,
  PROTOCOL_VERSION,
  PartnerResponseSchema,
  sign,
  toTour,
  type PartnerRequest,
} from "./protocol.js";
import type { EndpointTestResult, Partner } from "./registry.js";

// Partner endpoints are URLs supplied by the public, so every outbound call is guarded
// against reaching private networks (SSRF). ALLOW_LOCAL_PARTNER_URLS=true is for local dev only.
const allowLocal = process.env.ALLOW_LOCAL_PARTNER_URLS === "true";

const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 4],
] as const) {
  blocked.addSubnet(addr, prefix, "ipv4");
}
for (const [addr, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  blocked.addSubnet(addr, prefix, "ipv6");
}

function isBlockedAddress(address: string): boolean {
  if (allowLocal) return false;
  // Check IPv4-mapped IPv6 (::ffff:10.0.0.1) against the IPv4 rules. (Adding ::ffff:0:0/96
  // to the list instead would block every IPv4 address, since BlockList maps between families.)
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return blocked.check(mapped, "ipv4");
  return blocked.check(address, net.isIPv6(address) ? "ipv6" : "ipv4");
}

/** Resolve DNS, but refuse to connect to private or loopback addresses. */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (bad || list.length === 0) {
      return callback(new Error(`Refusing to connect to non-public address for ${hostname}`), "", 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

const agent = new Agent({ connect: { lookup: guardedLookup, timeout: PARTNER_TIMEOUT_MS } });

/** Static URL checks, done at registration time and again before every call. */
export function validateEndpointUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Not a valid URL.";
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(allowLocal && local && url.protocol === "http:")) {
    return "Endpoint must use https://.";
  }
  if (url.username || url.password) return "Credentials in the URL aren't allowed. We sign every request instead.";
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedAddress(host)) return "Endpoint must be on the public internet.";
  if (!allowLocal && (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal"))) {
    return "Endpoint must be on the public internet.";
  }
  return null;
}

interface CallResult {
  tours: Tour[];
  httpStatus: number | null;
  latencyMs: number;
  errors: string[];
}

/** Send one signed search request to a partner and validate what comes back. */
export async function callPartner(partner: Partner, intent: SearchIntent, limit = 20): Promise<CallResult> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const urlError = validateEndpointUrl(partner.endpointUrl);
  if (urlError) return { tours: [], httpStatus: null, latencyMs: 0, errors: [urlError] };

  const requestId = `req_${randomBytes(6).toString("hex")}`;
  const payload: PartnerRequest = { version: PROTOCOL_VERSION, requestId, intent, limit: Math.min(limit, MAX_TOURS) };
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));

  let res;
  try {
    res = await fetch(partner.endpointUrl, {
      method: "POST",
      body,
      redirect: "manual",
      dispatcher: agent,
      signal: AbortSignal.timeout(PARTNER_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `TourMatch-Partner-Client/${PROTOCOL_VERSION}`,
        "X-TourMatch-Partner-Id": partner.id,
        "X-TourMatch-Request-Id": requestId,
        "X-TourMatch-Timestamp": timestamp,
        "X-TourMatch-Signature": sign(partner.secret, timestamp, body),
      },
    });
  } catch (err) {
    const e = err as Error & { cause?: Error & { code?: string } };
    const reason =
      e.name === "TimeoutError"
        ? `No response within ${PARTNER_TIMEOUT_MS / 1000}s`
        : e.cause?.code === "ECONNREFUSED"
          ? "Connection refused. Is the server running and reachable from the internet?"
          : e.cause?.message || e.cause?.code || e.message;
    return { tours: [], httpStatus: null, latencyMs: elapsed(), errors: [`Request failed: ${reason}`] };
  }

  if (res.status >= 300 && res.status < 400) {
    return { tours: [], httpStatus: res.status, latencyMs: elapsed(), errors: ["Redirects aren't followed. Register the final URL."] };
  }
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ". Your endpoint rejected our signature: check that TOURMATCH_SECRET matches your current secret."
        : "";
    return { tours: [], httpStatus: res.status, latencyMs: elapsed(), errors: [`Endpoint returned HTTP ${res.status}${hint}`] };
  }

  const text = await res.text();
  if (text.length > 2_000_000) {
    return { tours: [], httpStatus: res.status, latencyMs: elapsed(), errors: ["Response is larger than 2 MB."] };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { tours: [], httpStatus: res.status, latencyMs: elapsed(), errors: ["Response body isn't valid JSON."] };
  }

  const parsed = PartnerResponseSchema.safeParse(json);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { tours: [], httpStatus: res.status, latencyMs: elapsed(), errors };
  }
  return {
    tours: parsed.data.tours.map((t) => toTour(partner.id, partner.companyName, t)),
    httpStatus: res.status,
    latencyMs: elapsed(),
    errors: [],
  };
}

export function toTestResult(r: CallResult): EndpointTestResult {
  return {
    at: new Date().toISOString(),
    ok: r.errors.length === 0,
    httpStatus: r.httpStatus,
    latencyMs: r.latencyMs,
    tourCount: r.tours.length,
    errors: r.errors,
  };
}
