import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPublicWeb } from "../lib/giie-connectors";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("NEAS GIIE Brave public search adapter", () => {
  it("rejects short queries before attempting provider access", async () => {
    await expect(searchPublicWeb("  ")).rejects.toThrow("3–300 characters");
  });

  it("fails closed when the server-side API key is missing", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
    await expect(searchPublicWeb("wind turbine inspection")).rejects.toThrow("BRAVE_SEARCH_API_KEY");
  });

  it("normalizes results and preserves source URLs", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-server-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      web: { results: [{
        title: "Wind inspection research",
        url: "https://research.example.org/wind",
        description: "A public research lead",
        profile: { long_name: "Research Institute" },
        page_age: "2026-11-23",
      }] },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchPublicWeb("wind turbine inspection", 5);
    expect(result.provider).toBe("brave");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].url).toBe("https://research.example.org/wind");
    expect(result.results[0].sourceName).toBe("Research Institute");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not silently treat provider failures as empty search results", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-server-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(searchPublicWeb("industrial rope access")).rejects.toThrow("rate limit");
  });
});
