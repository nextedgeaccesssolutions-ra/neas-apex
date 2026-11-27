import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/neas-api-security";
import { authorizeNeasScope, resolveNeasAdminPrincipalFromRequest } from "@/lib/neas-workforce-authz";
import { getNeasSearchConsoleReport } from "@/lib/neas-search-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

function isoDate(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!authorizeNeasScope(principal, "giie:public:search").allowed) {
    return NextResponse.json({ error: "Insufficient GIIE permissions." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const rate = consumeRateLimit(request, "neas-search-console", 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Search Console report limit reached. Try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const params = request.nextUrl.searchParams;
  const endDate = isoDate(params.get("endDate")) ?? new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  const startDate = isoDate(params.get("startDate")) ?? new Date(Date.parse(endDate + "T00:00:00Z") - 27 * 86_400_000).toISOString().slice(0, 10);
  if ((params.has("startDate") && !isoDate(params.get("startDate"))) || (params.has("endDate") && !isoDate(params.get("endDate")))) {
    return NextResponse.json({ error: "Dates must use YYYY-MM-DD format." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const report = await getNeasSearchConsoleReport(startDate, endDate);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search Console report failed.";
    const status = /not configured|credentials are incomplete/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
