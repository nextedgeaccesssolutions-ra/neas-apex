import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import { authorizeNeasScope, resolveNeasAdminPrincipalFromRequest } from "@/lib/neas-workforce-authz";
import { persistPublicDiscovery } from "@/lib/giie-store";
import type { GiieDiscovery } from "@/lib/neas-giie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

function hasValidConnectorToken(request: NextRequest): boolean {
  const expected = process.env.GIIE_CONNECTOR_API_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (process.env.GIIE_INGESTION_ENABLED !== "true") return jsonError("GIIE ingestion is disabled.", 503);
  const connectorAuthorized = hasValidConnectorToken(request);
  if (!connectorAuthorized) {
    if (!isSameOriginBrowserRequest(request)) return jsonError("Request not permitted.", 403);
    const principal = resolveNeasAdminPrincipalFromRequest(request);
    if (!principal) return jsonError("Authentication required.", 401);
    if (!authorizeNeasScope(principal, "giie:public:ingest").allowed) return jsonError("Insufficient GIIE ingestion permissions.", 403);
  }
  const rate = consumeRateLimit(request, "neas-giie-ingest", 30, 10 * 60 * 1000);
  if (!rate.allowed) return jsonError("GIIE ingestion rate limit reached.", 429);

  let discovery: GiieDiscovery;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 16_384) return jsonError("GIIE discovery request is too large.", 413);
    discovery = JSON.parse(raw) as GiieDiscovery;
  } catch { return jsonError("Invalid discovery JSON.", 400); }

  try {
    const result = await persistPublicDiscovery(discovery);
    return NextResponse.json({ ok: true, ...result }, {
      status: result.inserted ? 201 : 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIIE ingestion failed.";
    const status = /not registered and approved|not approved for ingestion/.test(message) ? 403
      : /hourly ingestion quota/.test(message) ? 429
      : /Invalid GIIE discovery|Only public|Source URL|does not match/.test(message) ? 400
      : /not configured|schema is not installed/.test(message) ? 503 : 502;
    return jsonError(message, status);
  }
}
