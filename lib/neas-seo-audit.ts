export type SeoCheckStatus = "pass" | "warning" | "fail";

export type SeoCheck = {
  id: string;
  status: SeoCheckStatus;
  detail: string;
};

export type NeasSeoAudit = {
  site: string;
  auditedAt: string;
  checks: SeoCheck[];
  pagespeed: {
    status: "available" | "unavailable";
    strategy: "mobile";
    scores?: { performance: number | null; accessibility: number | null; bestPractices: number | null; seo: number | null };
    error?: string;
  };
  sitemap: { url: string | null; urlCount: number };
};

const DEFAULT_SITE = "https://www.nextedge-access-solutions.com";
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 12_000;

function check(id: string, status: SeoCheckStatus, detail: string): SeoCheck {
  return { id, status, detail };
}

function normalizeSiteUrl(value: string | undefined): URL {
  const raw = (value || DEFAULT_SITE).trim();
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("SEO audit site must be an HTTPS origin without credentials or a custom port.");
  }
  if (url.hostname !== "www.nextedge-access-solutions.com" && url.hostname !== "nextedge-access-solutions.com") {
    throw new Error("SEO audit target is not an approved NEAS public website host.");
  }
  return new URL("/", url.origin);
}

async function fetchSameOrigin(input: URL, origin: string): Promise<Response> {
  let current = new URL(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    if (current.origin !== origin || current.protocol !== "https:") {
      throw new Error("Request redirected outside the approved NEAS HTTPS origin.");
    }
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "NEAS-SEO-Audit/1.0 (+https://www.nextedge-access-solutions.com)" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response did not include a Location header.");
    current = new URL(location, current);
  }
  throw new Error("NEAS website exceeded the SEO audit redirect limit.");
}

function countSitemapUrls(xml: string): number {
  return (xml.match(/<url\b/gi) || []).length;
}

async function pageSpeed(url: string): Promise<NeasSeoAudit["pagespeed"]> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    endpoint.searchParams.append("category", category);
  }
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      return { status: "unavailable", strategy: "mobile", error: "PageSpeed Insights returned HTTP " + response.status + "." };
    }
    const payload = await response.json() as {
      lighthouseResult?: { categories?: Record<string, { score?: number | null }> };
    };
    const categories = payload.lighthouseResult?.categories ?? {};
    const score = (key: string) => {
      const value = categories[key]?.score;
      return typeof value === "number" ? Math.round(value * 100) : null;
    };
    return {
      status: "available",
      strategy: "mobile",
      scores: {
        performance: score("performance"),
        accessibility: score("accessibility"),
        bestPractices: score("best-practices"),
        seo: score("seo"),
      },
    };
  } catch {
    return { status: "unavailable", strategy: "mobile", error: "PageSpeed Insights could not be reached before timeout or network failure." };
  }
}

/**
 * Read-only, origin-restricted technical SEO audit. It never accepts a caller-
 * supplied URL, writes to a database, submits URLs to search engines, or edits
 * public pages. PageSpeed Insights is a public Google endpoint and needs no key
 * for low-volume use; a key may be configured outside this module if required.
 */
export async function auditNeasWebsiteSeo(
  siteValue = process.env.NEAS_PUBLIC_SITE_URL,
): Promise<NeasSeoAudit> {
  const site = normalizeSiteUrl(siteValue);
  const origin = site.origin;
  const checks: SeoCheck[] = [];
  let sitemapUrl: string | null = null;
  let sitemapCount = 0;

  let homepage: Response | null = null;
  try {
    homepage = await fetchSameOrigin(site, origin);
    checks.push(check("homepage-http", homepage.ok ? "pass" : "fail", "Homepage returned HTTP " + homepage.status + "."));
  } catch {
    checks.push(check("homepage-http", "fail", "Homepage could not be fetched from the approved NEAS origin."));
  }

  if (homepage?.ok) {
    const html = await homepage.text();
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
    const description = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]
      ?? html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1];
    const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
      ?? html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1];
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    checks.push(check("title", title ? (title.length <= 70 ? "pass" : "warning") : "fail", title ? "Homepage title is present (" + title.length + " characters)." : "Homepage title is missing."));
    checks.push(check("meta-description", description ? (description.length >= 70 && description.length <= 170 ? "pass" : "warning") : "fail", description ? "Meta description is present (" + description.length + " characters)." : "Meta description is missing."));
    let canonicalStatus: SeoCheckStatus = "fail";
    let canonicalDetail = "Canonical URL is missing.";
    if (canonical) {
      try {
        const canonicalUrl = new URL(canonical, origin);
        canonicalStatus = canonicalUrl.origin === origin ? "pass" : "fail";
        canonicalDetail = canonicalStatus === "pass" ? "Canonical URL resolves to the approved NEAS origin." : "Canonical URL points to a different origin.";
      } catch { canonicalDetail = "Canonical URL is malformed."; }
    }
    checks.push(check("canonical", canonicalStatus, canonicalDetail));
    checks.push(check("h1", h1Count === 1 ? "pass" : "warning", "Homepage contains " + h1Count + " H1 headings; target is exactly one."));
    checks.push(check("viewport", /<meta\b[^>]*name=["']viewport["']/i.test(html) ? "pass" : "warning", "Responsive viewport metadata " + (/ <meta/.test(html) ? "detected." : "not detected.")));
    checks.push(check("noindex", /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) ? "fail" : "pass", "Homepage must not carry a noindex directive."));
  }

  try {
    const robotsResponse = await fetchSameOrigin(new URL("/robots.txt", origin), origin);
    const robots = robotsResponse.ok ? await robotsResponse.text() : "";
    checks.push(check("robots", robotsResponse.ok ? "pass" : "fail", "robots.txt returned HTTP " + robotsResponse.status + "."));
    const sitemapLine = robots.split(/\r?\n/).find((line) => /^\s*sitemap\s*:/i.test(line));
    if (sitemapLine) {
      const raw = sitemapLine.slice(sitemapLine.indexOf(":") + 1).trim();
      const candidate = new URL(raw, origin);
      if (candidate.origin === origin && candidate.protocol === "https:") sitemapUrl = candidate.toString();
      else checks.push(check("sitemap-origin", "fail", "robots.txt sitemap directive points outside the approved NEAS origin."));
    } else {
      checks.push(check("sitemap-declaration", "warning", "robots.txt does not declare a Sitemap URL."));
    }
  } catch {
    checks.push(check("robots", "fail", "robots.txt could not be fetched or parsed."));
  }

  sitemapUrl ??= new URL("/sitemap.xml", origin).toString();
  try {
    const sitemapResponse = await fetchSameOrigin(new URL(sitemapUrl), origin);
    const xml = sitemapResponse.ok ? await sitemapResponse.text() : "";
    sitemapCount = countSitemapUrls(xml);
    const validXml = /<\?xml|<urlset\b|<sitemapindex\b/i.test(xml);
    checks.push(check("sitemap", sitemapResponse.ok && validXml ? "pass" : "fail", "Sitemap returned HTTP " + sitemapResponse.status + " and contains " + sitemapCount + " URL entries."));
    checks.push(check("sitemap-nonempty", sitemapCount > 0 ? "pass" : "warning", "Sitemap URL entries: " + sitemapCount + "."));
  } catch {
    checks.push(check("sitemap", "fail", "Sitemap could not be fetched from the approved NEAS origin."));
  }

  const pagespeedResult = await pageSpeed(origin + "/");
  checks.push(check("pagespeed", pagespeedResult.status === "available" ? "pass" : "warning", pagespeedResult.status === "available" ? "Google PageSpeed Insights returned mobile Lighthouse category scores." : (pagespeedResult.error ?? "PageSpeed unavailable.")));

  return {
    site: origin,
    auditedAt: new Date().toISOString(),
    checks,
    pagespeed: pagespeedResult,
    sitemap: { url: sitemapUrl, urlCount: sitemapCount },
  };
}
