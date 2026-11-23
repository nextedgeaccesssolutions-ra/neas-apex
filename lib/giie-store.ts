import { isIP } from "node:net";
import { validatePublicDiscovery, type GiieDiscovery, type GiieSourceType } from "./neas-giie";

export interface GiiePersistResult {
  inserted: boolean;
  id?: string;
}

export interface GiieSourceRecord {
  id: string;
  source_url: string;
  source_name: string;
  source_type: GiieSourceType;
  enabled: boolean;
  terms_reviewed: boolean;
  robots_reviewed: boolean;
  quota_per_hour: number;
  last_checked_at: string | null;
  last_success_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function supabaseConfig() {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) throw new Error("GIIE storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY server-side.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("GIIE storage requires the approved HTTPS Supabase project URL.");
  }
  return { baseUrl, serviceKey };
}

async function supabaseRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
  prefer?: string,
): Promise<T> {
  const { baseUrl, serviceKey } = supabaseConfig();
  const response = await fetch(new URL("rest/v1/" + path, baseUrl + "/"), {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(method !== "GET" ? { Prefer: prefer ?? "return=representation" } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("GIIE database request failed with HTTP " + response.status + ".");
  if (response.status === 204) return [] as T;
  return await response.json() as T;
}

export function normalizeSourceUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Source URL must use HTTP or HTTPS.");
  if (url.username || url.password) throw new Error("Source URL must not contain credentials.");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

export function validateGiieSourceRegistration(input: {
  sourceUrl: string;
  sourceName: string;
  sourceType: string;
}): { normalizedUrl: string; sourceName: string; sourceType: GiieSourceType } {
  const normalizedUrl = normalizeSourceUrl(input.sourceUrl);
  const parsed = new URL(normalizedUrl);
  if (parsed.protocol !== "https:") throw new Error("GIIE sources must use HTTPS.");
  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || isIP(host) !== 0) {
    throw new Error("Local and IP-address GIIE sources are not permitted.");
  }
  const sourceTypes: readonly string[] = [
    "official-api", "rss", "public-webpage", "government", "standards-organization",
    "peer-reviewed-journal", "academic-repository", "patent-database", "open-source-repository",
    "public-tender-portal", "industry-publication", "public-forum", "public-video",
  ];
  if (!sourceTypes.includes(input.sourceType)) throw new Error("Unsupported GIIE source type.");
  const sourceName = input.sourceName.trim();
  if (sourceName.length < 2 || sourceName.length > 120) throw new Error("Source name must contain 2–120 characters.");
  return { normalizedUrl, sourceName, sourceType: input.sourceType as GiieSourceType };
}

export async function listGiieSources(): Promise<GiieSourceRecord[]> {
  const params = new URLSearchParams({
    select: "id,source_url,source_name,source_type,enabled,terms_reviewed,robots_reviewed,quota_per_hour,last_checked_at,last_success_at,metadata,created_at,updated_at",
    order: "created_at.desc",
    limit: "100",
  });
  return supabaseRequest<GiieSourceRecord[]>("giie_sources?" + params.toString(), "GET");
}

/** Register sources disabled; a separate explicit owner review is required before ingestion. */
export async function registerGiieSource(input: {
  sourceUrl: string;
  sourceName: string;
  sourceType: string;
  registeredBy: string;
}): Promise<GiieSourceRecord> {
  const validated = validateGiieSourceRegistration(input);
  const rows = await supabaseRequest<GiieSourceRecord[]>("giie_sources", "POST", {
    source_url: validated.normalizedUrl,
    source_name: validated.sourceName,
    source_type: validated.sourceType,
    enabled: false,
    terms_reviewed: false,
    robots_reviewed: false,
    quota_per_hour: 0,
    metadata: { registered_by: input.registeredBy, registration_status: "pending_review" },
  });
  if (!rows[0]) throw new Error("GIIE source registration returned no record.");
  return rows[0];
}

export function validateGiieSourceReview(input: {
  termsReviewed: boolean;
  robotsReviewed: boolean;
  enabled: boolean;
  quotaPerHour: number;
  reviewNote: string;
}): string {
  if (!Number.isInteger(input.quotaPerHour) || input.quotaPerHour < 0 || input.quotaPerHour > 1000) {
    throw new Error("GIIE source quota must be between 0 and 1000 items per hour.");
  }
  const reviewNote = input.reviewNote.trim();
  if (reviewNote.length < 20 || reviewNote.length > 1000) {
    throw new Error("A source terms and robots review note of 20–1000 characters is required.");
  }
  if (input.enabled && (!input.termsReviewed || !input.robotsReviewed || input.quotaPerHour < 1)) {
    throw new Error("A GIIE source cannot be enabled until terms, robots policy, and a positive quota are reviewed.");
  }
  return reviewNote;
}

/** Owner attestation is recorded before a source can be enabled. */
export async function reviewGiieSource(input: {
  id: string;
  termsReviewed: boolean;
  robotsReviewed: boolean;
  enabled: boolean;
  quotaPerHour: number;
  reviewedBy: string;
  reviewNote: string;
}): Promise<GiieSourceRecord> {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid GIIE source ID.");
  const reviewNote = validateGiieSourceReview(input);

  const existingParams = new URLSearchParams({
    select: "id,metadata",
    id: "eq." + input.id,
    limit: "1",
  });
  const existing = await supabaseRequest<Array<{ id: string; metadata: Record<string, unknown> }>>(
    "giie_sources?" + existingParams.toString(),
    "GET",
  );
  if (!existing[0]) throw new Error("GIIE source was not found.");
  const metadata = {
    ...(existing[0].metadata ?? {}),
    reviewed_by: input.reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_note: reviewNote,
    registration_status: input.enabled ? "approved" : "reviewed_disabled",
  };
  const params = new URLSearchParams({
    id: "eq." + input.id,
    select: "id,source_url,source_name,source_type,enabled,terms_reviewed,robots_reviewed,quota_per_hour,last_checked_at,last_success_at,metadata,created_at,updated_at",
  });
  const rows = await supabaseRequest<GiieSourceRecord[]>("giie_sources?" + params.toString(), "PATCH", {
    terms_reviewed: input.termsReviewed,
    robots_reviewed: input.robotsReviewed,
    enabled: input.enabled,
    quota_per_hour: input.quotaPerHour,
    metadata,
  });
  if (!rows[0]) throw new Error("GIIE source review did not update a record.");
  return rows[0];
}

/** Persist only validated public-space metadata from a source explicitly approved in the registry. */
export async function persistPublicDiscovery(discovery: GiieDiscovery): Promise<GiiePersistResult> {
  const errors = validatePublicDiscovery(discovery);
  if (errors.length) throw new Error("Invalid GIIE discovery: " + errors.join(" "));
  if (discovery.knowledgeSpace !== "public-global-intelligence") throw new Error("Only public GIIE discoveries may be stored here.");

  const normalizedUrl = normalizeSourceUrl(discovery.sourceUrl);
  const sourceParams = new URLSearchParams({
    select: "id,source_name,source_type,quota_per_hour",
    source_url: "eq." + normalizedUrl,
    enabled: "eq.true",
    terms_reviewed: "eq.true",
    robots_reviewed: "eq.true",
    limit: "1",
  });
  const approvedSources = await supabaseRequest<Array<{ id: string; source_name: string; source_type: GiieSourceType; quota_per_hour: number }>>(
    "giie_sources?" + sourceParams.toString(),
    "GET",
  );
  const source = approvedSources[0];
  if (!source) throw new Error("GIIE source is not registered and approved for ingestion.");
  if (source.source_type !== discovery.sourceType) throw new Error("GIIE discovery source type does not match its approved source registry entry.");
  const existingParams = new URLSearchParams({
    select: "id",
    normalized_url: "eq." + normalizedUrl,
    limit: "1",
  });
  const existing = await supabaseRequest<Array<{ id: string }>>(
    "giie_discoveries?" + existingParams.toString(),
    "GET",
  );
  if (existing[0]) return { inserted: false, id: existing[0].id };
  if (!Number.isInteger(source.quota_per_hour) || source.quota_per_hour < 1) {
    throw new Error("GIIE source ingestion quota is not configured.");
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const quotaParams = new URLSearchParams({
    select: "id",
    source_id: "eq." + source.id,
    created_at: "gte." + since,
    limit: String(Math.min(source.quota_per_hour + 1, 1001)),
  });
  const recent = await supabaseRequest<Array<{ id: string }>>("giie_discoveries?" + quotaParams.toString(), "GET");
  if (recent.length >= source.quota_per_hour) throw new Error("GIIE source hourly ingestion quota has been reached.");

  const row = {
    knowledge_space: "public-global-intelligence",
    source_id: source.id,
    source_url: discovery.sourceUrl,
    normalized_url: normalizedUrl,
    content_fingerprint: null,
    title: discovery.title,
    source_name: source.source_name,
    source_type: discovery.sourceType,
    published_at: discovery.publishedAt ?? null,
    discovered_at: discovery.discoveredAt,
    author_or_organization: discovery.authorOrOrganization ?? null,
    subjects: discovery.subjects,
    core_concept: discovery.coreConcept,
    problem: discovery.problem ?? null,
    proposed_solution: discovery.proposedSolution ?? null,
    technology: discovery.technology ?? [],
    industries: discovery.industries,
    geography: discovery.geography ?? [],
    evidence_class: discovery.evidenceClass,
    status: discovery.status,
    lawful_summary: discovery.lawfulSummary,
    license_notes: discovery.copyrightOrLicenseNotes ?? null,
    corroborating_source_urls: discovery.corroboratingSourceUrls,
    contradiction_notes: discovery.contradictionNotes,
    confidence: discovery.confidence,
    review_required: true,
  };

  const params = new URLSearchParams({ on_conflict: "normalized_url" });
  const result = await supabaseRequest<Array<{ id?: string }>>(
    "giie_discoveries?" + params.toString(),
    "POST",
    row,
    "resolution=ignore-duplicates,return=representation",
  );
  if (result.length) return { inserted: true, id: result[0].id };

  const duplicate = await supabaseRequest<Array<{ id: string }>>(
    "giie_discoveries?" + existingParams.toString(),
    "GET",
  );
  return { inserted: false, id: duplicate[0]?.id };
}

export async function beginGiieAuditEvent(input: {
  actorId: string;
  action: string;
  details: Record<string, unknown>;
  requestId: string;
}): Promise<string> {
  const rows = await supabaseRequest<Array<{ id: string }>>("aiw_audit_events", "POST", {
    actor_type: "human",
    actor_id: input.actorId,
    action: input.action,
    resource_type: "giie_source",
    resource_id: null,
    outcome: "pending",
    details: input.details,
    request_id: input.requestId,
  });
  if (!rows[0]?.id) throw new Error("GIIE audit event could not be created.");
  return rows[0].id;
}

export async function completeGiieAuditEvent(input: {
  id: string;
  outcome: "success" | "failure";
  resourceId?: string | null;
  details: Record<string, unknown>;
}): Promise<void> {
  const params = new URLSearchParams({ id: "eq." + input.id });
  await supabaseRequest(
    "aiw_audit_events?" + params.toString(),
    "PATCH",
    {
      outcome: input.outcome,
      resource_id: input.resourceId ?? null,
      details: input.details,
    },
  );
}
