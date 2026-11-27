import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { getNeasSearchConsoleReport, normalizeSearchConsoleSite } from "../lib/neas-search-console";

const originalCredentials = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
const originalSite = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalCredentials === undefined) delete process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
  else process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON = originalCredentials;
  if (originalSite === undefined) delete process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  else process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL = originalSite;
});

describe("NEAS Search Console connector", () => {
  it("accepts only approved NEAS properties", () => {
    expect(normalizeSearchConsoleSite("https://www.nextedge-access-solutions.com/")).toBe("https://www.nextedge-access-solutions.com/");
    expect(normalizeSearchConsoleSite("sc-domain:nextedge-access-solutions.com")).toBe("sc-domain:nextedge-access-solutions.com");
    expect(() => normalizeSearchConsoleSite("https://attacker.example/")).toThrow(/approved NEAS/);
    expect(() => normalizeSearchConsoleSite("http://www.nextedge-access-solutions.com/")).toThrow(/approved NEAS/);
  });

  it("rejects invalid date ranges before network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getNeasSearchConsoleReport("2026-12-01", "2026-11-01")).rejects.toThrow(/date range/);
    await expect(getNeasSearchConsoleReport("2026-01-01", "2026-05-01")).rejects.toThrow(/90 days/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses service-account OAuth and requests query/page rows without writes", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "neas-seo-reader@example.iam.gserviceaccount.com",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    });
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL = "https://www.nextedge-access-solutions.com/";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 });
      }
      expect(url).toContain("searchconsole.googleapis.com/webmasters/v3/sites/");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-token");
      const body = JSON.parse(String(init?.body));
      expect(body.dataState).toBe("final");
      return new Response(JSON.stringify({ rows: [{ keys: [body.dimensions[0] === "query" ? "rope access philippines" : "https://www.nextedge-access-solutions.com/"], clicks: 12, impressions: 100, ctr: 0.12, position: 4.2 }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await getNeasSearchConsoleReport("2026-10-01", "2026-10-28");
    expect(report.readOnly).toBe(true);
    expect(report.queries[0].clicks).toBe(12);
    expect(report.pages).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
