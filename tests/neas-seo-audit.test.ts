import { describe, expect, it, vi, afterEach } from "vitest";
import { auditNeasWebsiteSeo } from "../lib/neas-seo-audit";

const html = `<!doctype html><html><head><title>NEAS Rope Access Philippines</title><meta name="description" content="Professional rope access and renewable energy services across the Philippines for industrial clients and contractors."><link rel="canonical" href="https://www.nextedge-access-solutions.com/"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>Rope Access Philippines</h1></body></html>`;

afterEach(() => vi.unstubAllGlobals());

describe("NEAS read-only SEO audit", () => {
  it("rejects non-NEAS targets before making network requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(auditNeasWebsiteSeo("https://attacker.example/")).rejects.toThrow(/approved NEAS/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects HTTP and credential-bearing target URLs", async () => {
    await expect(auditNeasWebsiteSeo("http://www.nextedge-access-solutions.com")).rejects.toThrow(/HTTPS/);
    await expect(auditNeasWebsiteSeo("https://user:pass@www.nextedge-access-solutions.com")).rejects.toThrow(/HTTPS/);
  });

  it("checks metadata, robots, sitemap, and mobile PageSpeed without writes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://www.nextedge-access-solutions.com/") return new Response(html, { status: 200 });
      if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /\nSitemap: https://www.nextedge-access-solutions.com/sitemap.xml", { status: 200 });
      if (url.endsWith("/sitemap.xml")) return new Response('<?xml version="1.0"?><urlset><url><loc>https://www.nextedge-access-solutions.com/</loc></url></urlset>', { status: 200 });
      if (url.includes("pagespeedonline")) return new Response(JSON.stringify({ lighthouseResult: { categories: { performance: { score: 0.91 }, accessibility: { score: 0.99 }, "best-practices": { score: 1 }, seo: { score: 0.98 } } } }), { status: 200, headers: { "Content-Type": "application/json" } });
      throw new Error("Unexpected network target: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    const report = await auditNeasWebsiteSeo();
    expect(report.checks.find((item) => item.id === "canonical")?.status).toBe("pass");
    expect(report.checks.find((item) => item.id === "robots")?.status).toBe("pass");
    expect(report.checks.find((item) => item.id === "sitemap")?.status).toBe("pass");
    expect(report.pagespeed.scores?.seo).toBe(98);
    expect(report.sitemap.urlCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("refuses redirects outside the NEAS origin", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://www.nextedge-access-solutions.com/") return new Response(null, { status: 302, headers: { Location: "https://attacker.example/" } });
      if (url.includes("pagespeedonline")) return new Response("{}", { status: 200 });
      return new Response("", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const report = await auditNeasWebsiteSeo();
    expect(report.checks.find((item) => item.id === "homepage-http")?.status).toBe("fail");
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("attacker.example"))).toBe(false);
  });
});
