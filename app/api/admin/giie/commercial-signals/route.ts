import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/neas-api-security";
import {
  authorizeNeasScope,
  resolveNeasAdminPrincipalFromRequest,
} from "@/lib/neas-workforce-authz";
import { listCommercialSignals } from "@/lib/giie-commercial-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
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
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return jsonError("Authentication required.", 401);
  if (!authorizeNeasScope(principal, "giie:public:search").allowed) {
    return jsonError("Insufficient GIIE permissions.", 403);
  }

  const rate = consumeRateLimit(
    request,
    "neas-giie-commercial-signals",
    60,
    60 * 1000,
  );
  if (!rate.allowed)
    return jsonError("Commercial intelligence rate limit reached.", 429);

  const params = request.nextUrl.searchParams;
  const industry = params.get("industry")?.trim();
  const minimumScoreRaw = params.get("minimumScore");
  const limitRaw = params.get("limit");
  if (industry && !/^[a-z][a-z0-9-]{1,39}$/.test(industry)) {
    return jsonError("Invalid industry filter.", 400);
  }
  const minimumScore =
    minimumScoreRaw === null ? undefined : Number(minimumScoreRaw);
  if (
    minimumScore !== undefined &&
    (!Number.isInteger(minimumScore) || minimumScore < 0 || minimumScore > 100)
  ) {
    return jsonError("minimumScore must be an integer from 0 to 100.", 400);
  }
  const limit = limitRaw === null ? 50 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return jsonError("limit must be an integer from 1 to 100.", 400);
  }

  try {
    const signals = await listCommercialSignals({
      industry,
      minimumScore,
      limit,
    });
    return NextResponse.json(
      { signals, count: signals.length },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch {
    return jsonError(
      "Commercial intelligence data is unavailable. Confirm the database migration and server secrets.",
      503,
    );
  }
}
