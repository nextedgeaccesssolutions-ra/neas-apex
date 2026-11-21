import { NextRequest, NextResponse } from "next/server";

const AGENT_ID =
  process.env.ELEVENLABS_AGENT_ID || "agent_8601m7zrgsg4f98srgkekzq7ana9";
const BRANCH_ID =
  process.env.ELEVENLABS_AGENT_BRANCH_ID || "agtbrch_7901m7ztt97yecs8wqrvrk9zzwqy";
const SIGNED_URL_ENDPOINT =
  "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deny(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const origin = headers.get("origin");
  const fetchSite = headers.get("sec-fetch-site");

  if (!host || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site")) {
    return deny("This request is not permitted.", 403);
  }

  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return deny("Cross-origin conversation requests are not permitted.", 403);
      }
    } catch {
      return deny("Invalid request origin.", 403);
    }
  }

  const clientKey = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || host;
  const now = Date.now();
  for (const [key, bucket] of requestBuckets) {
    if (bucket.resetAt <= now) requestBuckets.delete(key);
  }
  const current = requestBuckets.get(clientKey);
  if (current && current.resetAt > now && current.count >= MAX_REQUESTS_PER_WINDOW) {
    return deny("Too many text sessions. Please wait before trying again.", 429);
  }
  if (!current || current.resetAt <= now) {
    requestBuckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    current.count += 1;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return deny("Text chat is not configured. Please contact NEAS.", 503);
  }

  const query = new URLSearchParams({ agent_id: AGENT_ID, branch_id: BRANCH_ID });
  try {
    const response = await fetch(`${SIGNED_URL_ENDPOINT}?${query.toString()}`, {
      method: "GET",
      headers: { "xi-api-key": apiKey, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const payload: unknown = await response.json().catch(() => ({}));
    const data = payload as { signed_url?: unknown };
    if (!response.ok) {
      return deny(
        response.status === 401 || response.status === 403
          ? "Text conversation authentication failed. Please contact NEAS support."
          : "The text conversation service is temporarily unavailable.",
        502,
      );
    }
    if (typeof data.signed_url !== "string" || !data.signed_url) {
      return deny("The text conversation service did not return a secure URL.", 502);
    }
    return NextResponse.json(
      { signedUrl: data.signed_url },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          Vary: "Origin",
        },
      },
    );
  } catch {
    return deny("Unable to connect to the text conversation service. Please retry.", 502);
  }
}
