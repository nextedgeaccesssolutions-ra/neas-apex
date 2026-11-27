import { createHash } from "node:crypto";
import { searchPublicWeb, type GiieSearchResult } from "./giie-connectors";

export type PhilippinesTopicGroup = {
  id: string;
  label: string;
  industry: string;
  queries: readonly [string, string];
};
export type GoogleTrendItem = { title: string; url: string; publishedAt?: string; approximateTraffic?: string };
export type TrendObservation = {
  signal_key: string; observed_hour: string; title: string; source_url: string; source_name: string;
  source_type: "google-trends-rss" | "brave-search"; topic_group: string; industry: string; geography: string[];
  search_rank: number | null; search_volume_label: string | null; discovery_score: number; score_method: string;
  score_basis: Record<string, unknown>; evidence_excerpt: string; published_at: string | null; observed_at: string;
};

export const PHILIPPINES_TOPIC_GROUPS: readonly PhilippinesTopicGroup[] = [
  { id: "energy-utilities", label: "Energy and utilities", industry: "energy", queries: ["Philippines energy industry renewable power grid investment projects latest", "Philippines electricity utilities solar wind offshore power plant market"] },
  { id: "construction-infrastructure", label: "Construction and infrastructure", industry: "construction", queries: ["Philippines construction infrastructure public private projects latest", "Philippines buildings roads bridges ports infrastructure investment"] },
  { id: "manufacturing-mining", label: "Manufacturing and mining", industry: "manufacturing", queries: ["Philippines manufacturing industrial production factory investment latest", "Philippines mining minerals industrial processing projects latest"] },
  { id: "agriculture-fisheries", label: "Agriculture and fisheries", industry: "agriculture", queries: ["Philippines agriculture fisheries food production industry latest", "Philippines agritech food processing farming investment trends"] },
  { id: "tourism-hospitality", label: "Tourism and hospitality", industry: "tourism", queries: ["Philippines tourism hospitality hotel travel industry latest", "Philippines tourism infrastructure destinations investment trends"] },
  { id: "transport-logistics", label: "Transport and logistics", industry: "transport-logistics", queries: ["Philippines transport logistics ports shipping aviation industry latest", "Philippines railways roads freight supply chain projects"] },
  { id: "technology-telecom", label: "Technology and telecommunications", industry: "technology", queries: ["Philippines technology artificial intelligence data centers telecom latest", "Philippines cybersecurity software digital economy technology investment"] },
  { id: "finance-commerce", label: "Finance and commerce", industry: "finance-commerce", queries: ["Philippines banking finance fintech e-commerce retail industry latest", "Philippines consumer market trade online shopping business trends"] },
  { id: "healthcare-pharma", label: "Healthcare and pharmaceuticals", industry: "healthcare", queries: ["Philippines healthcare hospitals medical devices pharmaceutical industry latest", "Philippines healthcare investment health technology market trends"] },
  { id: "education-workforce", label: "Education and workforce", industry: "education", queries: ["Philippines education skills training employment labor market latest", "Philippines technical vocational training workforce development demand"] },
  { id: "government-procurement", label: "Government and procurement", industry: "government", queries: ["Philippines government procurement public tenders infrastructure projects latest", "Philippines DOE DPWH DOTr project announcements bids contracts"] },
  { id: "environment-climate", label: "Environment and climate", industry: "environment", queries: ["Philippines climate resilience disaster risk water environment projects latest", "Philippines waste management sustainability climate adaptation investment"] },
] as const;

const INDUSTRY_TERMS: ReadonlyArray<{ industry: string; terms: readonly string[] }> = [
  { industry: "energy", terms: ["energy", "power", "solar", "wind", "turbine", "electricity", "offshore wind", "renewable", "grid", "geothermal", "hydro"] },
  { industry: "construction", terms: ["construction", "building", "infrastructure", "bridge", "road", "rail", "facade", "real estate", "property", "housing"] },
  { industry: "manufacturing", terms: ["manufacturing", "factory", "industrial", "mining", "cement", "steel", "semiconductor", "electronics", "production"] },
  { industry: "agriculture", terms: ["agriculture", "farming", "farm", "fisheries", "fishery", "aquaculture", "food", "rice", "coconut", "livestock"] },
  { industry: "tourism", terms: ["tourism", "hotel", "hospitality", "travel", "resort", "airport", "destination"] },
  { industry: "transport-logistics", terms: ["transport", "logistics", "shipping", "port", "maritime", "freight", "aviation", "railway", "supply chain"] },
  { industry: "technology", terms: ["technology", "artificial intelligence", "ai", "data center", "telecom", "telecommunications", "software", "cybersecurity", "cloud", "digital"] },
  { industry: "finance-commerce", terms: ["bank", "finance", "fintech", "e-commerce", "ecommerce", "retail", "trade", "shopping", "consumer", "payment"] },
  { industry: "healthcare", terms: ["health", "hospital", "medical", "pharma", "pharmaceutical", "clinic", "medicine", "biotech"] },
  { industry: "education", terms: ["education", "school", "university", "training", "employment", "workforce", "skills", "labor", "licensure"] },
  { industry: "government", terms: ["government", "tender", "procurement", "department of energy", "doe", "dpwh", "dotr", "contract", "bidding", "public-private"] },
  { industry: "environment", terms: ["climate", "environment", "disaster", "flood", "water", "waste", "resilience", "sustainability", "pollution"] },
];
const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity: string) => {
      if (entity[0] !== "#") return XML_ENTITIES[entity.toLowerCase()] ?? match;
      const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    })
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function xmlTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

export function parseGoogleTrendsRss(xml: string): GoogleTrendItem[] {
  if (typeof xml !== "string" || !xml.trim() || xml.length > 1_000_000) return [];
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, 50).flatMap((item): GoogleTrendItem[] => {
    const title = xmlTag(item, "title");
    if (!title) return [];
    const rawLink = xmlTag(item, "link");
    let url = "https://trends.google.com/trends/explore?geo=PH&q=" + encodeURIComponent(title);
    if (rawLink) {
      try {
        const parsed = new URL(rawLink);
        if (parsed.protocol !== "https:" || (parsed.hostname !== "google.com" && !parsed.hostname.endsWith(".google.com"))) return [];
        url = parsed.toString();
      } catch { /* retain canonical Google Trends query URL */ }
    }
    const publishedAt = xmlTag(item, "pubDate");
    const approximateTraffic = xmlTag(item, "ht:approx_traffic");
    return [{ title: title.slice(0, 500), url, ...(publishedAt ? { publishedAt } : {}), ...(approximateTraffic ? { approximateTraffic: approximateTraffic.slice(0, 80) } : {}) }];
  });
}

export function getHourlyTopicGroup(now = new Date()): PhilippinesTopicGroup {
  const hour = Math.floor(now.getTime() / 3_600_000);
  return PHILIPPINES_TOPIC_GROUPS[((hour % PHILIPPINES_TOPIC_GROUPS.length) + PHILIPPINES_TOPIC_GROUPS.length) % PHILIPPINES_TOPIC_GROUPS.length];
}
export function classifyPhilippineIndustry(text: string): string {
  const normalized = " " + text.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  for (const item of INDUSTRY_TERMS) {
    if (item.terms.some((term) => normalized.includes(" " + term.trim().toLowerCase() + " "))) return item.industry;
  }
  return "general-business";
}
export function scoreGoogleTrend(rank: number): number {
  if (!Number.isInteger(rank) || rank < 1) throw new Error("Trend rank must be a positive integer.");
  return Math.max(5, Math.min(100, 100 - ((rank - 1) * 2)));
}
export function scoreSearchDiscovery(result: Pick<GiieSearchResult, "title" | "description" | "publishedAt">, now = new Date()): number {
  const text = (result.title + " " + result.description).toLowerCase();
  let score = 25;
  if (text.includes("philippines") || text.includes("philippine")) score += 15;
  if (/\b(project|investment|launch|expansion|contract|tender|facility|plant|development|market)\b/i.test(text)) score += 20;
  if (result.publishedAt) {
    const published = Date.parse(result.publishedAt);
    if (Number.isFinite(published) && published <= now.getTime()) {
      const ageDays = (now.getTime() - published) / 86_400_000;
      score += ageDays <= 3 ? 25 : ageDays <= 14 ? 15 : ageDays <= 45 ? 5 : 0;
    }
  }
  return Math.max(0, Math.min(100, score));
}
function hourIso(now: Date): string {
  const hour = new Date(now);
  hour.setUTCMinutes(0, 0, 0);
  return hour.toISOString();
}
function fingerprint(sourceType: string, identity: string): string {
  return createHash("sha256").update(sourceType + "|" + identity.trim().toLowerCase()).digest("hex");
}
function publishedIso(value?: string): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function buildGoogleTrendObservations(items: readonly GoogleTrendItem[], now = new Date()): TrendObservation[] {
  return items.map((item, index) => {
    const rank = index + 1;
    return {
      signal_key: fingerprint("google-trends-rss", item.title), observed_hour: hourIso(now), title: item.title,
      source_url: item.url, source_name: "Google Trends Philippines", source_type: "google-trends-rss",
      topic_group: "all-industries", industry: classifyPhilippineIndustry(item.title), geography: ["Philippines"],
      search_rank: rank, search_volume_label: item.approximateTraffic ?? null, discovery_score: scoreGoogleTrend(rank),
      score_method: "google_trends_rank_priority_v1",
      score_basis: { rank, approximateTraffic: item.approximateTraffic ?? null, note: "Priority is derived from the feed rank; it is not an absolute search-volume estimate." },
      evidence_excerpt: "Philippines trending-search feed item. Verify the original Google Trends page before drawing commercial conclusions.",
      published_at: publishedIso(item.publishedAt), observed_at: now.toISOString(),
    };
  });
}
export function buildSearchObservations(results: readonly GiieSearchResult[], topicGroup: PhilippinesTopicGroup, now = new Date()): TrendObservation[] {
  return results.map((result) => {
    const text = result.title + " " + result.description;
    const classified = classifyPhilippineIndustry(text);
    return {
      signal_key: fingerprint("brave-search", result.url), observed_hour: hourIso(now), title: result.title.slice(0, 500),
      source_url: result.url, source_name: result.sourceName.slice(0, 200), source_type: "brave-search",
      topic_group: topicGroup.id, industry: classified === "general-business" ? topicGroup.industry : classified,
      geography: ["Philippines"], search_rank: null, search_volume_label: null,
      discovery_score: scoreSearchDiscovery(result, now), score_method: "web_discovery_priority_v1",
      score_basis: {
        hasPhilippinesReference: /philippin/i.test(text),
        hasCommercialSignal: /\b(project|investment|launch|expansion|contract|tender|facility|plant|development|market)\b/i.test(text),
        publishedAt: result.publishedAt ?? null,
        note: "This is a research-priority heuristic, not a search-growth or popularity metric.",
      },
      evidence_excerpt: result.description.slice(0, 1_500), published_at: publishedIso(result.publishedAt), observed_at: now.toISOString(),
    };
  });
}

function databaseConfig() {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) throw new Error("Trend storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) throw new Error("Trend storage requires the approved HTTPS Supabase project URL.");
  return { baseUrl, serviceKey };
}
async function databaseRequest<T>(path: string, method: "GET" | "POST" | "PATCH", body?: unknown, prefer?: string): Promise<T> {
  const { baseUrl, serviceKey } = databaseConfig();
  const response = await fetch(new URL("rest/v1/" + path, baseUrl + "/"), {
    method,
    headers: {
      apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json", "Content-Type": "application/json",
      ...(method !== "GET" ? { Prefer: prefer ?? "return=representation" } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Trend database request failed with HTTP " + response.status + ".");
  return response.status === 204 ? [] as T : await response.json() as T;
}
async function fetchGoogleTrendsFeed(): Promise<GoogleTrendItem[]> {
  const response = await fetch("https://trends.google.com/trending/rss?geo=PH", {
    headers: { Accept: "application/rss+xml, application/xml, text/xml" }, cache: "no-store",
    redirect: "error", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Google Trends Philippines feed returned HTTP " + response.status + ".");
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > 1_000_000) throw new Error("Google Trends feed exceeded the 1 MB limit.");
  const xml = await response.text();
  if (new TextEncoder().encode(xml).byteLength > 1_000_000) throw new Error("Google Trends feed exceeded the 1 MB limit.");
  return parseGoogleTrendsRss(xml);
}
async function persistObservations(rows: readonly TrendObservation[]): Promise<number> {
  if (!rows.length) return 0;
  const params = new URLSearchParams({ on_conflict: "signal_key,observed_hour", select: "id" });
  const inserted = await databaseRequest<Array<{ id: string }>>(
    "giie_trend_observations?" + params.toString(), "POST", rows, "resolution=merge-duplicates,return=representation",
  );
  return inserted.length;
}

export async function runPhilippinesTrendCollection(now = new Date()): Promise<{
  status: "completed" | "partial";
  topicGroup: string;
  queries: string[];
  googleTrendCount: number;
  webResultCount: number;
  persistedCount: number;
  warnings: string[];
}> {
  if (process.env.GIIE_TREND_COLLECTION_ENABLED !== "true") {
    throw new Error("Philippines trend collection is disabled. Set GIIE_TREND_COLLECTION_ENABLED=true.");
  }

  const topicGroup = getHourlyTopicGroup(now);
  const warnings: string[] = [];
  const runRows = await databaseRequest<Array<{ id: string }>>("giie_trend_runs?select=id", "POST", [{
    status: "running",
    topic_group: topicGroup.id,
    queries: [...topicGroup.queries],
    started_at: now.toISOString(),
  }]);
  const runId = runRows[0]?.id;
  if (!runId) throw new Error("Trend run audit record could not be created.");

  try {
    const [googleResult, searchResults] = await Promise.all([
      fetchGoogleTrendsFeed().then((items) => ({ items })).catch((error) => {
        warnings.push(error instanceof Error ? error.message : "Google Trends feed failed.");
        return { items: [] as GoogleTrendItem[] };
      }),
      Promise.all(topicGroup.queries.map((query) =>
        searchPublicWeb(query, 5).then((response) => response.results).catch((error) => {
          warnings.push("Brave Search: " + (error instanceof Error ? error.message : "provider request failed."));
          return [] as GiieSearchResult[];
        }),
      )),
    ]);

    const observations = [
      ...buildGoogleTrendObservations(googleResult.items, now),
      ...buildSearchObservations(searchResults.flat(), topicGroup, now),
    ];
    if (!observations.length) {
      throw new Error("Trend collection returned no observations. " + warnings.join(" "));
    }

    const persistedCount = await persistObservations(observations);
    const status = warnings.length ? "partial" as const : "completed" as const;
    const patch = new URLSearchParams({ id: "eq." + runId, select: "id" });
    await databaseRequest("giie_trend_runs?" + patch.toString(), "PATCH", {
      status,
      completed_at: new Date().toISOString(),
      google_trend_count: googleResult.items.length,
      web_result_count: searchResults.reduce((sum, group) => sum + group.length, 0),
      persisted_count: persistedCount,
      warning_summary: warnings.join("\n").slice(0, 2_000) || null,
    });

    return {
      status,
      topicGroup: topicGroup.id,
      queries: [...topicGroup.queries],
      googleTrendCount: googleResult.items.length,
      webResultCount: searchResults.reduce((sum, group) => sum + group.length, 0),
      persistedCount,
      warnings,
    };
  } catch (error) {
    const patch = new URLSearchParams({ id: "eq." + runId, select: "id" });
    await databaseRequest("giie_trend_runs?" + patch.toString(), "PATCH", {
      status: "failed",
      completed_at: new Date().toISOString(),
      warning_summary: (error instanceof Error ? error.message : "Trend collection failed.").slice(0, 2_000),
    }).catch(() => undefined);
    throw error;
  }
}
