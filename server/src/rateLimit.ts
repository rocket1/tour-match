import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

/** Fixed-window, in-memory rate limiter. Good enough for one instance. */
export function rateLimit(opts: { limit: number; windowMs: number; key?: (c: Context) => string }): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const key = opts.key?.(c) ?? clientIp(c);
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else if (++entry.count > opts.limit) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: "Too many requests. Try again shortly." }, 429);
    }
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    await next();
  };
}

function clientIp(c: Context): string {
  // Only trust X-Forwarded-For when you deploy behind a proxy you control.
  if (process.env.TRUST_PROXY === "true") {
    const fwd = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}
