import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { searchPublicWeb } from "@/lib/giie-connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) return jsonError("This request is not permitted.", 403);
  const rate = consumeRateLimit(request, "neas-giie-public-search", 10, 10 * 60 * 1000);
  if (!rate.allowed) return jsonError("GIIE search rate limit reached. Please wait and retry.", 429);
  if (process.env.GIIE_PUBLIC_SEARCH_ENABLED !== "true") {
    return jsonError("GIIE public search is disabled. An administrator must explicitly enable it.", 503);
  }

  let body: { query?: unknown; count?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return jsonError("Invalid request body.", 400); }
  if (typeof body.query !== "string" || body.query.trim().length < 3 || body.query.length > 300) {
    return jsonError("Provide a public research query between 3 and 300 characters.", 400);
  }
  const count = typeof body.count === "number" && Number.isFinite(body.count) ? body.count : 8;

  try {
    const data = await searchPublicWeb(body.query, count);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIIE public search failed.";
    const status = /not configured|disabled/i.test(message) ? 503 : /rate limit/i.test(message) ? 429 : 502;
    return jsonError(message, status);
  }
}
