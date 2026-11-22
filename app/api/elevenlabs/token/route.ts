import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "agent_8601m7zrgsg4f98srgkekzq7ana9";
const ELEVENLABS_API = "https://api.elevenlabs.io/v1/convai/conversation/token";

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

  const rate = consumeRateLimit(request, "elevenlabs-token", 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return deny("Too many voice sessions. Please wait before trying again.", 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return deny("Voice service is not configured. Please use text chat or contact NEAS.", 503);
  }

  const query = new URLSearchParams({ agent_id: AGENT_ID });
  try {
    const response = await fetch(`${ELEVENLABS_API}?${query.toString()}`, {
      method: "GET",
      headers: { "xi-api-key": apiKey, accept: "application/json" },
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
      { token: data.token },
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
