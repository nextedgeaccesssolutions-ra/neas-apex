import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConfiguredRssFeeds } from "../lib/neas-giie-rss";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();

  it("rejects an oversized declared feed before buffering its body", async () => {
    vi.stubEnv("GIIE_RSS_FEEDS", JSON.stringify([{ name: "Large feed", url: "https://feeds.example.org/rss.xml" }]));
    vi.stubEnv("GIIE_RSS_ALLOWED_HOSTS", "feeds.example.org");
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { "content-type": "application/rss+xml", "content-length": "1000001" },
    })));

    const result = await fetchConfiguredRssFeeds();
    expect(result.items).toHaveLength(0);
    expect(result.warnings[0]).toContain("1 MB");
    expect(cancelled).toBe(true);
  });

  it("enforces the feed byte ceiling while streaming a chunked response", async () => {
    vi.stubEnv("GIIE_RSS_FEEDS", JSON.stringify([{ name: "Chunked feed", url: "https://feeds.example.org/rss.xml" }]));
    vi.stubEnv("GIIE_RSS_ALLOWED_HOSTS", "feeds.example.org");
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(600_000)); },
      cancel() { cancelled = true; },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { "content-type": "application/rss+xml" },
    })));

    const result = await fetchConfiguredRssFeeds();
    expect(result.items).toHaveLength(0);
    expect(result.warnings[0]).toContain("1 MB");
    expect(cancelled).toBe(true);
  });
});

describe("NEAS GIIE configured RSS connector", () => {
  it("returns a clear empty result when no feeds are configured", async () => {
    vi.stubEnv("GIIE_RSS_FEEDS", "");
    expect(await fetchConfiguredRssFeeds()).toEqual({ items: [], warnings: ["No RSS feeds are configured."] });
  });

  it("blocks feed hosts that are not explicitly allowlisted", async () => {
    vi.stubEnv("GIIE_RSS_FEEDS", JSON.stringify([{ name: "Untrusted", url: "https://example.org/feed.xml" }]));
    vi.stubEnv("GIIE_RSS_ALLOWED_HOSTS", "");
    const result = await fetchConfiguredRssFeeds();
    expect(result.items).toHaveLength(0);
    expect(result.warnings[0]).toContain("not explicitly allowlisted");
  });

  it("parses an allowlisted RSS feed and preserves source references", async () => {
    vi.stubEnv("GIIE_RSS_FEEDS", JSON.stringify([{ name: "NEAS approved feed", url: "https://feeds.example.org/rss.xml" }]));
    vi.stubEnv("GIIE_RSS_ALLOWED_HOSTS", "feeds.example.org");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      '<rss><channel><item><title>Wind inspection update</title><link>https://publisher.example/article/1</link><description><![CDATA[New inspection approach &amp; methods]]></description><pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>',
      { status: 200, headers: { "content-type": "application/rss+xml" } },
    )));
    const result = await fetchConfiguredRssFeeds();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Wind inspection update");
    expect(result.items[0].url).toBe("https://publisher.example/article/1");
    expect(result.items[0].summary).toContain("New inspection approach & methods");
  });
});
