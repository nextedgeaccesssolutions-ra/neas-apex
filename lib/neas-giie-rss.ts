export interface GiieRssItem {
  title: string;
  url: string;
  summary: string;
  publishedAt?: string;
  feedName: string;
}

export interface GiieRssFeed {
  name: string;
  url: string;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

function configuredFeeds(): GiieRssFeed[] {
  const raw = process.env.GIIE_RSS_FEEDS?.trim();
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("GIIE_RSS_FEEDS must be a valid JSON array."); }
  if (!Array.isArray(parsed)) throw new Error("GIIE_RSS_FEEDS must be a JSON array.");
  return parsed.flatMap((item): GiieRssFeed[] => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.name !== "string" || typeof candidate.url !== "string") return [];
    return [{ name: candidate.name.slice(0, 120), url: candidate.url }];
  }).slice(0, 50);
}

function validateFeedUrl(raw: string): URL {
  const url = new URL(raw);
  const allowedHosts = (process.env.GIIE_RSS_ALLOWED_HOSTS ?? "")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (url.protocol !== "https:" || url.username || url.password || !allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error("RSS feed host is not explicitly allowlisted for GIIE.");
  }
  if (url.hostname === "localhost" || /^\d+(?:\.\d+){3}$/.test(url.hostname) || url.hostname.endsWith(".local")) {
    throw new Error("Local and IP-address RSS endpoints are not permitted.");
  }
  return url;
}

/**
 * Fetch only administrator-configured HTTPS feeds whose exact hostnames are
 * allowlisted. Redirects are disabled to prevent allowlist bypass and SSRF.
 */
export async function fetchConfiguredRssFeeds(): Promise<{ items: GiieRssItem[]; warnings: string[] }> {
  const feeds = configuredFeeds();
  if (!feeds.length) return { items: [], warnings: ["No RSS feeds are configured."] };
  const all: GiieRssItem[] = [];
  const warnings: string[] = [];

  for (const feed of feeds) {
    try {
      const url = validateFeedUrl(feed.url);
      const response = await fetch(url, {
        headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const contentType = response.headers.get("content-type") ?? "";
      if (!/(xml|rss|atom)/i.test(contentType)) throw new Error("Unexpected RSS content type.");
      const xml = await response.text();
      if (xml.length > 1_000_000) throw new Error("Feed exceeds the 1 MB ingestion limit.");

      const entries = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];
      for (const entry of entries.slice(0, 50)) {
        const title = tagValue(entry, "title");
        let link = tagValue(entry, "link");
        if (!link) {
          const href = entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
          link = href?.[1];
        }
        const summary = tagValue(entry, "description") ?? tagValue(entry, "summary") ?? tagValue(entry, "content") ?? "";
        const publishedAt = tagValue(entry, "pubDate") ?? tagValue(entry, "published") ?? tagValue(entry, "updated");
        if (!title || !link) continue;
        try {
          const itemUrl = new URL(link, url);
          if (itemUrl.protocol !== "https:" && itemUrl.protocol !== "http:") continue;
          all.push({ title: title.slice(0, 500), url: itemUrl.toString(), summary: summary.slice(0, 1800), ...(publishedAt ? { publishedAt } : {}), feedName: feed.name });
        } catch { /* malformed item link */ }
      }
    } catch (error) {
      warnings.push(feed.name + ": " + (error instanceof Error ? error.message : "Feed retrieval failed."));
    }
  }
  return { items: all, warnings };
}
