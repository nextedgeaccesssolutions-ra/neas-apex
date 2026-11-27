import { createSign } from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SEARCH_CONSOLE_URL = "https://searchconsole.googleapis.com/webmasters/v3";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_SITE = "https://www.nextedge-access-solutions.com/";

export type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type SearchConsoleReport = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  queries: SearchConsoleRow[];
  pages: SearchConsoleRow[];
  source: "google-search-console";
  readOnly: true;
};

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

function configuredServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Google Search Console is not configured. Add GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON as a server-side secret.");
  let account: ServiceAccount;
  try {
    account = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("Google Search Console service-account JSON is invalid.");
  }
  if (!account.client_email || !account.private_key || !account.private_key.includes("PRIVATE KEY")) {
    throw new Error("Google Search Console service-account credentials are incomplete.");
  }
  return account;
}

export function normalizeSearchConsoleSite(value = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL): string {
  const site = (value || DEFAULT_SITE).trim();
  if (site === "sc-domain:nextedge-access-solutions.com") return site;
  let parsed: URL;
  try {
    parsed = new URL(site);
  } catch {
    throw new Error("Google Search Console site must be the approved NEAS domain property or HTTPS URL-prefix property.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
      !["www.nextedge-access-solutions.com", "nextedge-access-solutions.com"].includes(parsed.hostname) ||
      parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Google Search Console site is outside the approved NEAS property.");
  }
  return parsed.toString();
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: GOOGLE_SCOPE,
    aud: account.token_uri || GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claims;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + signer.sign(account.private_key!, "base64url");
  const response = await fetch(account.token_uri || GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Google OAuth token exchange failed with HTTP " + response.status + ".");
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google OAuth did not return an access token.");
  return payload.access_token;
}

function validateDateRange(startDate: string, endDate: string): void {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(startDate) || !iso.test(endDate) ||
      !Number.isFinite(Date.parse(startDate + "T00:00:00Z")) ||
      !Number.isFinite(Date.parse(endDate + "T00:00:00Z")) ||
      startDate > endDate) {
    throw new Error("Search Console date range must use valid YYYY-MM-DD dates with startDate no later than endDate.");
  }
  const days = (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) / 86_400_000;
  if (days > 90) throw new Error("Search Console date range is limited to 90 days per request.");
}

async function queryRows(token: string, siteUrl: string, startDate: string, endDate: string, dimension: "query" | "page"): Promise<SearchConsoleRow[]> {
  const endpoint = GOOGLE_SEARCH_CONSOLE_URL + "/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ startDate, endDate, dimensions: [dimension], rowLimit: 250, dataState: "final" }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Google Search Console " + dimension + " query failed with HTTP " + response.status + ".");
  const payload = await response.json() as { rows?: SearchConsoleRow[] };
  return Array.isArray(payload.rows) ? payload.rows : [];
}

/**
 * Read-only Search Console reporting. Uses a dedicated Google service account
 * shared with the verified NEAS Search Console property. It never writes to
 * Search Console, the CMS, or a database.
 */
export async function getNeasSearchConsoleReport(
  startDate: string,
  endDate: string,
): Promise<SearchConsoleReport> {
  validateDateRange(startDate, endDate);
  const siteUrl = normalizeSearchConsoleSite();
  const account = configuredServiceAccount();
  const token = await accessToken(account);
  const [queries, pages] = await Promise.all([
    queryRows(token, siteUrl, startDate, endDate, "query"),
    queryRows(token, siteUrl, startDate, endDate, "page"),
  ]);
  return { siteUrl, startDate, endDate, queries, pages, source: "google-search-console", readOnly: true };
}
