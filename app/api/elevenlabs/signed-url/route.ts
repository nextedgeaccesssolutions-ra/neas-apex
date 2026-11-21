import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";

const AGENT_ID =
  process.env.ELEVENLABS_AGENT_ID || "agent_8601m7zrgsg4f98srgkekzq7ana9";
const BRANCH_ID =
  process.env.ELEVENLABS_AGENT_BRANCH_ID || "agtbrch_7901m7ztt97yecs8wqrvrk9zzwqy";
const SIGNED_URL_ENDPOINT =
  "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deny(message: string, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        ...extraHeaders,
      },
    },
  );
}

export async function GET(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) {
    return deny("This request is not permitted.", 403);
  }

  const rate = consumeRateLimit(request, "elevenlabs-signed-url", 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return deny("Too many text sessions. Please wait before trying again.", 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
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
