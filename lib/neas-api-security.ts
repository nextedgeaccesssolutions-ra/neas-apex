import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function isSameOriginBrowserRequest(request: NextRequest): boolean {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const origin = headers.get("origin");
  const fetchSite = headers.get("sec-fetch-site");

  // Browser POST requests from fetch() include Origin. Requiring it avoids
  // treating an origin-less request as same-origin by default.
  if (!host || !origin) return false;
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return false;

  try {
    const parsedOrigin = new URL(origin);
    return (parsedOrigin.protocol === "https:" || parsedOrigin.protocol === "http:")
      && parsedOrigin.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function consumeRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || host;
  const key = `${namespace}:${ip}`;

  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }

  const current = buckets.get(key);
  if (current && current.resetAt > now && current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    current.count += 1;
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Production readiness contract for privileged NEAS AI runtime activation.
 *
 * This is deliberately a fail-closed gate, not an authentication provider.
 * Callers must establish an authenticated principal and durable controls
 * before marking any privileged capability ready. Do not use environment
 * variable presence as evidence of a live, tested provider or service.
 */
export type NeasRuntimeCapability =
  | "identity"
  | "authorization"
  | "durable-rate-limit"
  | "durable-audit"
  | "task-store"
  | "model-live-validation"
  | "voice-live-validation"
  | "specialist-execution"
  | "giie-search"
  | "giie-ingestion"
  | "giie-semantic-retrieval";

export type NeasRuntimeEvidence = {
  capability: NeasRuntimeCapability;
  verified: boolean;
  verifiedAt?: string;
  evidenceRef?: string;
  note?: string;
};

export type NeasRuntimeReadiness = {
  ready: boolean;
  checkedAt: string;
  verified: NeasRuntimeCapability[];
  blocked: NeasRuntimeCapability[];
  reasons: string[];
};

export const NEAS_PRIVILEGED_CAPABILITIES: readonly NeasRuntimeCapability[] = [
  "identity",
  "authorization",
  "durable-rate-limit",
  "durable-audit",
  "task-store",
  "model-live-validation",
  "voice-live-validation",
  "specialist-execution",
  "giie-search",
  "giie-ingestion",
  "giie-semantic-retrieval",
] as const;

/**
 * Evaluate explicit evidence supplied by runtime health checks.
 * Missing, stale, or incomplete evidence is blocked by default.
 */
export function evaluateNeasRuntimeReadiness(
  evidence: readonly NeasRuntimeEvidence[],
  now = Date.now(),
  maxEvidenceAgeMs = 15 * 60 * 1000,
): NeasRuntimeReadiness {
  if (!Number.isFinite(now) || !Number.isFinite(maxEvidenceAgeMs) || maxEvidenceAgeMs < 0) {
    throw new Error("Invalid NEAS runtime readiness clock configuration.");
  }

  const byCapability = new Map<NeasRuntimeCapability, NeasRuntimeEvidence>();
  for (const item of evidence) {
    if (!NEAS_PRIVILEGED_CAPABILITIES.includes(item.capability)) {
      throw new Error("Unknown NEAS runtime capability evidence.");
    }
    // Duplicate evidence is ambiguous. Fail closed instead of selecting a winner.
    if (byCapability.has(item.capability)) {
      throw new Error("Duplicate NEAS runtime capability evidence: " + item.capability);
    }
    byCapability.set(item.capability, item);
  }

  const verified: NeasRuntimeCapability[] = [];
  const blocked: NeasRuntimeCapability[] = [];
  const reasons: string[] = [];

  for (const capability of NEAS_PRIVILEGED_CAPABILITIES) {
    const item = byCapability.get(capability);
    if (!item || item.verified !== true || !item.verifiedAt || !item.evidenceRef?.trim()) {
      blocked.push(capability);
      reasons.push(capability + ": missing explicit verification evidence.");
      continue;
    }
    const timestamp = Date.parse(item.verifiedAt);
    if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > maxEvidenceAgeMs) {
      blocked.push(capability);
      reasons.push(capability + ": verification evidence is invalid, future-dated, or stale.");
      continue;
    }
    verified.push(capability);
  }

  return {
    ready: blocked.length === 0,
    checkedAt: new Date(now).toISOString(),
    verified,
    blocked,
    reasons,
  };
}

