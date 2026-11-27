import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/neas-api-security";
import { authorizeNeasScope, resolveNeasAdminPrincipalFromRequest } from "@/lib/neas-workforce-authz";
import { auditNeasWebsiteSeo } from "@/lib/neas-seo-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET(request: NextRequest) {
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!authorizeNeasScope(principal, "giie:public:search").allowed) {
    return NextResponse.json({ error: "Insufficient GIIE permissions." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const rate = consumeRateLimit(request, "neas-seo-audit", 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "SEO audit limit reached. Try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const report = await auditNeasWebsiteSeo();
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEO audit configuration is invalid.";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
