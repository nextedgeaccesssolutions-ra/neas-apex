import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function isSameOriginBrowserRequest(request: NextRequest): boolean {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const origin = headers.get("origin");
  const fetchSite = headers.get("sec-fetch-site");

  // Browser POST requests from fetch() include Origin. Requiring it avoids
  // treating an origin-less request as same-origin by default.
  if (!host || !origin) return false;
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return false;

  try {
    const parsedOrigin = new URL(origin);
    return (parsedOrigin.protocol === "https:" || parsedOrigin.protocol === "http:")
      && parsedOrigin.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function consumeRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || host;
  const key = `${namespace}:${ip}`;

  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }

  const current = buckets.get(key);
  if (current && current.resetAt > now && current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    current.count += 1;
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
