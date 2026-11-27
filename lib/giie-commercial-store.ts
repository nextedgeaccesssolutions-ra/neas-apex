export interface GiieCommercialSignalRecord {
  id: string;
  signal_key: string;
  title: string;
  source_url: string;
  source_name: string;
  industry: string;
  signal_type: string;
  geography: string[];
  published_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seen_count: number;
  discovery_score: number;
  score_method: string;
  score_basis: Record<string, unknown>;
  evidence_excerpt: string;
  verification_status: string;
  lead_status: string;
  publication_status: string;
  publication_reason: string;
}

function databaseConfig() {
  const baseUrl = (process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey)
    throw new Error("Commercial intelligence storage is not configured.");
  const parsed = new URL(baseUrl);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".supabase.co")
  ) {
    throw new Error(
      "Commercial intelligence storage requires an approved HTTPS Supabase project URL.",
    );
  }
  return { baseUrl, serviceKey };
}

export async function listCommercialSignals(
  input: {
    industry?: string;
    minimumScore?: number;
    limit?: number;
  } = {},
): Promise<GiieCommercialSignalRecord[]> {
  const { baseUrl, serviceKey } = databaseConfig();
  const params = new URLSearchParams({
    select:
      "id,signal_key,title,source_url,source_name,industry,signal_type,geography,published_at,first_seen_at,last_seen_at,seen_count,discovery_score,score_method,score_basis,evidence_excerpt,verification_status,lead_status,publication_status,publication_reason",
    order: "discovery_score.desc,last_seen_at.desc",
    limit: String(input.limit ?? 50),
  });
  if (input.industry) params.set("industry", "eq." + input.industry);
  if (typeof input.minimumScore === "number")
    params.set("discovery_score", "gte." + input.minimumScore);

  const response = await fetch(
    new URL(
      "rest/v1/giie_commercial_signals?" + params.toString(),
      baseUrl + "/",
    ),
    {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok)
    throw new Error(
      "Commercial intelligence query failed with HTTP " + response.status + ".",
    );
  return (await response.json()) as GiieCommercialSignalRecord[];
}
