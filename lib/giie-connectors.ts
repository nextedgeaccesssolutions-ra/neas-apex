import type { GiieSourceType } from "./neas-giie";

export interface GiieSearchResult {
  title: string;
  url: string;
  description: string;
  sourceName: string;
  sourceType: GiieSourceType;
  publishedAt?: string;
  provider: "brave";
}

export interface GiieSearchResponse {
  query: string;
  provider: "brave";
  results: GiieSearchResult[];
  retrievedAt: string;
  warnings: string[];
}

function getBraveKey(): string {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) throw new Error("GIIE search is not configured. Set BRAVE_SEARCH_API_KEY in the server environment.");
  return key;
}

/** Search only the public web. Never pass internal documents or company records to this adapter. */
export async function searchPublicWeb(query: string, count = 8): Promise<GiieSearchResponse> {
  const normalized = query.trim();
  if (normalized.length < 3 || normalized.length > 300) throw new Error("Search query must be 3–300 characters.");
  const safeCount = Math.min(20, Math.max(1, Math.floor(count)));
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", normalized);
  url.searchParams.set("count", String(safeCount));
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("text_decorations", "false");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": getBraveKey(),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("The configured public search provider rejected its API credentials.");
    if (response.status === 429) throw new Error("The public search provider rate limit has been reached. Retry later.");
    throw new Error("The public search provider is temporarily unavailable.");
  }

  const payload = await response.json() as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string; age?: string; page_age?: string; profile?: { long_name?: string; name?: string } }> };
  };
  const results = (payload.web?.results ?? []).flatMap((item): GiieSearchResult[] => {
    if (!item.title || !item.url) return [];
    try {
      const parsed = new URL(item.url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return [];
      return [{
        title: item.title.slice(0, 500),
        url: parsed.toString(),
        description: (item.description ?? "").slice(0, 1600),
        sourceName: (item.profile?.long_name ?? item.profile?.name ?? parsed.hostname).slice(0, 200),
        sourceType: "public-webpage",
        ...(item.page_age || item.age ? { publishedAt: item.page_age ?? item.age } : {}),
        provider: "brave",
      }];
    } catch { return []; }
  });

  return {
    query: normalized,
    provider: "brave",
    results,
    retrievedAt: new Date().toISOString(),
    warnings: [
      "Search results are discovery leads, not verified facts.",
      "Open and assess original sources before classifying or storing discoveries.",
      "Do not include confidential NEAS records or personal data in public search queries.",
    ],
  };
}
