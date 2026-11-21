import { NextRequest, NextResponse } from "next/server";

const AGENT_ID =
  process.env.ELEVENLABS_AGENT_ID || "agent_8601m7zrgsg4f98srgkekzq7ana9";
const BRANCH_ID =
  process.env.ELEVENLABS_AGENT_BRANCH_ID || "agtbrch_7901m7ztt97yecs8wqrvrk9zzwqy";
const TOKEN_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/token";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 20;

// Best-effort per-instance rate limit. Production-wide limits should be backed
// by a shared store if NEAS later needs higher traffic or multi-region control.
const tokenBuckets = new Map<string, { count: number; resetAt: number }>();

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

  // This endpoint is same-origin browser functionality, not a public token proxy.
  if (!host || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site")) {
    return deny("This request is not permitted.", 403);
  }

  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return deny("Cross-origin token requests are not permitted.", 403);
      }
    } catch {
      return deny("Invalid request origin.", 403);
    }
  }

  const forwardedFor = headers.get("x-forwarded-for");
  const clientKey = forwardedFor?.split(",")[0]?.trim() || host;
  const now = Date.now();

  for (const [key, bucket] of tokenBuckets) {
    if (bucket.resetAt <= now) tokenBuckets.delete(key);
  }

  const current = tokenBuckets.get(clientKey);
  if (current && current.resetAt > now && current.count >= MAX_TOKENS_PER_WINDOW) {
    return deny("Too many voice sessions. Please wait before trying again.", 429);
  }

  if (!current || current.resetAt <= now) {
    tokenBuckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    current.count += 1;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return deny("Voice service is not configured. Please use text chat or contact NEAS.", 503);
  }

  const query = new URLSearchParams({
    agent_id: AGENT_ID,
    branch_id: BRANCH_ID,
  });

  try {
    const response = await fetch(`${TOKEN_ENDPOINT}?${query.toString()}`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const payload: unknown = await response.json().catch(() => ({}));
    const data = payload as { token?: unknown };

    if (!response.ok) {
      return deny(
        response.status === 401 || response.status === 403
          ? "Voice authentication failed. Please contact NEAS support."
          : "The voice service is temporarily unavailable. Please try again.",
        502,
      );
    }

    if (typeof data.token !== "string" || data.token.length === 0) {
      return deny("The voice service did not return a session token.", 502);
    }

    return NextResponse.json(
      { token: data.token, agentId: AGENT_ID, branchId: BRANCH_ID },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          Vary: "Origin",
        },
      },
    );
  } catch {
    return deny("Unable to connect to the voice service. Please retry.", 502);
  }
}
