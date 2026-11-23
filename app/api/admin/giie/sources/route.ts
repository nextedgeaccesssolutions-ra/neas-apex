import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeNeasScope, resolveNeasAdminPrincipalFromRequest } from "@/lib/neas-workforce-authz";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";
import {
  beginGiieAuditEvent,
  completeGiieAuditEvent,
  listGiieSources,
  registerGiieSource,
  reviewGiieSource,
} from "@/lib/giie-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 8_192) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function authorize(request: NextRequest, scope: "giie:public:search" | "giie:public:ingest") {
  const principal = resolveNeasAdminPrincipalFromRequest(request);
  if (!principal) return { principal: null, status: 401 as const };
  const result = authorizeNeasScope(principal, scope);
  return result.allowed
    ? { principal, status: 200 as const }
    : { principal: null, status: 403 as const };
}

export async function GET(request: NextRequest) {
  const auth = authorize(request, "giie:public:search");
  if (!auth.principal) return errorResponse("Authentication required.", auth.status);
  try {
    const sources = await listGiieSources();
    return NextResponse.json({ sources }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("GIIE source registry is unavailable.", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) return errorResponse("Request not permitted.", 403);
  const auth = authorize(request, "giie:public:ingest");
  if (!auth.principal) return errorResponse("Authentication required.", auth.status);
  const rate = consumeRateLimit(request, "neas-giie-source-register", 10, 10 * 60 * 1000);
  if (!rate.allowed) return errorResponse("GIIE source administration rate limit reached.", 429);

  const body = await readBody(request);
  if (!body || typeof body.sourceUrl !== "string" || typeof body.sourceName !== "string" || typeof body.sourceType !== "string") {
    return errorResponse("Provide a source URL, source name, and source type.", 400);
  }

  let auditId: string | undefined;
  const requestId = randomUUID();
  try {
    auditId = await beginGiieAuditEvent({
      actorId: auth.principal.subject,
      action: "giie.source.register",
      requestId,
      details: { source_url: body.sourceUrl.slice(0, 500), source_name: body.sourceName.slice(0, 120), source_type: body.sourceType },
    });
    const source = await registerGiieSource({
      sourceUrl: body.sourceUrl,
      sourceName: body.sourceName,
      sourceType: body.sourceType,
      registeredBy: auth.principal.subject,
    });
    await completeGiieAuditEvent({
      id: auditId,
      outcome: "success",
      resourceId: source.id,
      details: { source_id: source.id, source_type: source.source_type, registration_status: "pending_review" },
    });
    return NextResponse.json({
      source,
      message: "Source registered disabled. Review its terms, robots policy, and quota before enabling ingestion.",
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (auditId) {
      await completeGiieAuditEvent({
        id: auditId,
        outcome: "failure",
        details: { failure: error instanceof Error ? error.message.slice(0, 240) : "GIIE source registration failed." },
      }).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "GIIE source registration failed.";
    const status = /must|unsupported|invalid|https|source name/i.test(message) ? 400
      : /HTTP 409|duplicate|already exists/i.test(message) ? 409 : 503;
    return errorResponse(status === 503 ? "GIIE source registration is unavailable." : message, status);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) return errorResponse("Request not permitted.", 403);
  const auth = authorize(request, "giie:public:ingest");
  if (!auth.principal) return errorResponse("Authentication required.", auth.status);
  const rate = consumeRateLimit(request, "neas-giie-source-review", 10, 10 * 60 * 1000);
  if (!rate.allowed) return errorResponse("GIIE source review rate limit reached.", 429);

  const body = await readBody(request);
  if (!body
    || typeof body.id !== "string"
    || typeof body.termsReviewed !== "boolean"
    || typeof body.robotsReviewed !== "boolean"
    || typeof body.enabled !== "boolean"
    || typeof body.quotaPerHour !== "number"
    || typeof body.reviewNote !== "string") {
    return errorResponse("Provide source ID, terms/robots review decisions, enabled state, quota, and review note.", 400);
  }

  let auditId: string | undefined;
  const requestId = randomUUID();
  try {
    auditId = await beginGiieAuditEvent({
      actorId: auth.principal.subject,
      action: "giie.source.review",
      requestId,
      details: {
        source_id: body.id,
        terms_reviewed: body.termsReviewed,
        robots_reviewed: body.robotsReviewed,
        requested_enabled: body.enabled,
        quota_per_hour: body.quotaPerHour,
        review_note: body.reviewNote.slice(0, 1000),
      },
    });
    const source = await reviewGiieSource({
      id: body.id,
      termsReviewed: body.termsReviewed,
      robotsReviewed: body.robotsReviewed,
      enabled: body.enabled,
      quotaPerHour: body.quotaPerHour,
      reviewedBy: auth.principal.subject,
      reviewNote: body.reviewNote,
    });
    await completeGiieAuditEvent({
      id: auditId,
      outcome: "success",
      resourceId: source.id,
      details: {
        source_id: source.id,
        enabled: source.enabled,
        terms_reviewed: source.terms_reviewed,
        robots_reviewed: source.robots_reviewed,
        quota_per_hour: source.quota_per_hour,
      },
    });
    return NextResponse.json({ source }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (auditId) {
      await completeGiieAuditEvent({
        id: auditId,
        outcome: "failure",
        resourceId: typeof body.id === "string" ? body.id : null,
        details: { failure: error instanceof Error ? error.message.slice(0, 240) : "GIIE source review failed." },
      }).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "GIIE source review failed.";
    const status = /must|invalid|quota|review note|cannot be enabled|not found/i.test(message) ? 400 : 503;
    return errorResponse(status === 503 ? "GIIE source review is unavailable." : message, status);
  }
}
