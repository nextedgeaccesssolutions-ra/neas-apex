import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/lib/neas-api-security";
import {
  authorizeNeasScope,
  resolveNeasAdminPrincipalFromRequest,
} from "@/lib/neas-workforce-authz";
import { evaluateAutoPublication } from "@/lib/giie-commercial";
import { submitCommercialBriefToCms } from "@/lib/giie-cms-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const briefSchema = z.object({
  signalId: z.string().trim().min(8).max(160).regex(/^[a-zA-Z0-9:_-]+$/),
  title: z.string().trim().min(12).max(180),
  industry: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(80).max(1400),
  body: z.string().trim().min(120).max(6000),
  seoDescription: z.string().trim().min(40).max(160),
  sources: z.array(z.object({
    title: z.string().trim().min(3).max(180),
    publisher: z.string().trim().min(2).max(120),
    url: z.string().url().max(2048),
    official: z.literal(true),
  }).strict()).min(2).max(8),
  verification: z.object({
    evidenceClass: z.literal("verified-official"),
    independentSourceCount: z.number().int().min(2).max(8),
    contentType: z.literal("market-summary"),
    hasSourceCitations: z.literal(true),
  }).strict(),
}).strict();

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
  );
}

export async function POST(request: NextRequest) {
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return jsonError("Authentication required.", 401);
  if (!authorizeNeasScope(principal, "giie:public:search").allowed) {
    return jsonError("Insufficient GIIE permissions.", 403);
  }

  const rate = consumeRateLimit(request, "neas-giie-commercial-cms-submit", 5, 60_000);
  if (!rate.allowed) return jsonError("Commercial CMS submission rate limit reached.", 429);

  let raw: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 24 * 1024) {
      return jsonError("Commercial brief exceeds the 24 KB limit.", 413);
    }
    raw = JSON.parse(text);
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = briefSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Commercial brief does not meet the verified market-summary schema.", 422);

  const gate = evaluateAutoPublication({
    evidenceClass: parsed.data.verification.evidenceClass,
    independentSourceCount: parsed.data.verification.independentSourceCount,
    contentType: parsed.data.verification.contentType,
    hasSourceCitations: parsed.data.verification.hasSourceCitations,
  });
  if (!gate.eligible) return jsonError(gate.reason, 422);

  const hosts = new Set<string>();
  for (const source of parsed.data.sources) {
    let url: URL;
    try { url = new URL(source.url); } catch { return jsonError("Invalid source URL.", 422); }
    if (url.protocol !== "https:" || url.username || url.password) {
      return jsonError("All evidence links must use HTTPS without embedded credentials.", 422);
    }
    hosts.add(url.hostname.toLowerCase());
  }
  if (hosts.size < 2 || hosts.size !== parsed.data.verification.independentSourceCount) {
    return jsonError("Evidence must contain the declared number of independent source hosts.", 422);
  }

  const cmsBrief = {
    ...parsed.data,
    verification: {
      status: "verified" as const,
      independentSourceCount: parsed.data.verification.independentSourceCount,
      policyVersion: "neas-giie-commercial-v1" as const,
    },
  };

  try {
    const result = await submitCommercialBriefToCms(cmsBrief);
    return NextResponse.json(
      { ...result, workflow: "pending_review", publication: "not_published" },
      { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "CMS submission failed.";
    return jsonError(message, 502);
  }
}
