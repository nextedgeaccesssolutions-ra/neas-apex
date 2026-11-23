import { validatePublicDiscovery, type GiieDiscovery } from "./neas-giie";

export interface GiiePersistResult {
  inserted: boolean;
  id?: string;
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

export function normalizeSourceUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Source URL must use HTTP or HTTPS.");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

/** Persist only validated public-space metadata and a lawful short summary. */
export async function persistPublicDiscovery(discovery: GiieDiscovery): Promise<GiiePersistResult> {
  const errors = validatePublicDiscovery(discovery);
  if (errors.length) throw new Error("Invalid GIIE discovery: " + errors.join(" "));
  if (discovery.knowledgeSpace !== "public-global-intelligence") throw new Error("Only public GIIE discoveries may be stored here.");

  const { baseUrl, serviceKey } = supabaseConfig();
  const row = {
    knowledge_space: "public-global-intelligence",
    source_url: discovery.sourceUrl,
    normalized_url: normalizeSourceUrl(discovery.sourceUrl),
    content_fingerprint: null,
    title: discovery.title,
    source_name: discovery.sourceName,
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

  const response = await fetch(
    baseUrl + "/rest/v1/giie_discoveries?on_conflict=normalized_url",
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(row),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok) {
    if (response.status === 404 || response.status === 400) throw new Error("GIIE database schema is not installed or does not match the current migration.");
    throw new Error("GIIE database write failed with HTTP " + response.status + ".");
  }
  const result = await response.json() as Array<{ id?: string }>;
  return result.length ? { inserted: true, id: result[0].id } : { inserted: false };
}
