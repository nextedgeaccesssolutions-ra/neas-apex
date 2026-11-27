import { describe, expect, it } from "vitest";
import {
  buildGoogleTrendObservations,
  buildSearchObservations,
  classifyPhilippineIndustry,
  getHourlyTopicGroup,
  parseGoogleTrendsRss,
  PHILIPPINES_TOPIC_GROUPS,
  scoreGoogleTrend,
  scoreSearchDiscovery,
} from "../lib/giie-ph-trends";

describe("NEAS GIIE Philippines trend taxonomy", () => {
  it("rotates deterministically through every industry group by UTC hour", () => {
    const first = getHourlyTopicGroup(new Date("2026-11-27T00:00:00.000Z"));
    const next = getHourlyTopicGroup(new Date("2026-11-27T01:00:00.000Z"));
    expect(first.id).not.toBe(next.id);
    const visited = new Set(Array.from({ length: PHILIPPINES_TOPIC_GROUPS.length }, (_, hour) =>
      getHourlyTopicGroup(new Date(Date.UTC(2026, 10, 27, hour))).id));
    expect(visited.size).toBe(PHILIPPINES_TOPIC_GROUPS.length);
  });

  it.each([
    ["offshore wind turbine project Philippines", "energy"],
    ["new bridge and rail infrastructure", "construction"],
    ["semiconductor manufacturing factory", "manufacturing"],
    ["Philippines fisheries and aquaculture", "agriculture"],
    ["hotel tourism resort", "tourism"],
    ["shipping port logistics", "transport-logistics"],
    ["AI data center telecom", "technology"],
    ["banking fintech retail", "finance-commerce"],
    ["hospital medical device", "healthcare"],
    ["technical training workforce skills", "education"],
    ["government procurement tender", "government"],
    ["climate resilience flood management", "environment"],
  ])("classifies %s", (input, expected) => {
    expect(classifyPhilippineIndustry(input)).toBe(expected);
  });
});

describe("Google Trends RSS parsing", () => {
  it("parses ranked Philippine trends, traffic labels, and source dates", () => {
    const xml = '<?xml version="1.0"?><rss><channel>' +
      '<item><title>Solar energy Philippines</title><link>https://trends.google.com/trends/explore?geo=PH</link><pubDate>Fri, 27 Nov 2026 00:00:00 GMT</pubDate><ht:approx_traffic>20K+</ht:approx_traffic></item>' +
      '<item><title><![CDATA[Wind turbine maintenance]]></title><link>https://trends.google.com/trends/explore?geo=PH</link></item>' +
      '</channel></rss>';
    const items = parseGoogleTrendsRss(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Solar energy Philippines");
    expect(items[0].approximateTraffic).toBe("20K+");
    expect(items[1].title).toBe("Wind turbine maintenance");
  });

  it("ignores malformed and non-Google links and enforces an input bound", () => {
    const xml = '<rss><item><title>Unsafe</title><link>https://evil.example/</link></item><item><title>Valid</title></item></rss>';
    expect(parseGoogleTrendsRss(xml)).toHaveLength(1);
    expect(parseGoogleTrendsRss("x".repeat(1_000_001))).toEqual([]);
    expect(parseGoogleTrendsRss("")).toEqual([]);
  });
});

describe("Philippine trend scoring", () => {
  it("uses Google feed rank as a transparent priority, not a search-volume claim", () => {
    expect(scoreGoogleTrend(1)).toBe(100);
    expect(scoreGoogleTrend(2)).toBe(98);
    expect(scoreGoogleTrend(50)).toBe(5);
    expect(() => scoreGoogleTrend(0)).toThrow();
  });

  it("prioritizes recent commercial search discoveries without inventing growth rates", () => {
    const now = new Date("2026-11-27T00:00:00.000Z");
    expect(scoreSearchDiscovery({
      title: "Philippines wind project investment",
      description: "New project announcement",
      publishedAt: "2026-11-26T00:00:00.000Z",
    }, now)).toBeGreaterThan(scoreSearchDiscovery({
      title: "Historical topic",
      description: "Old reference",
      publishedAt: "2025-01-01T00:00:00.000Z",
    }, now));
    expect(scoreSearchDiscovery({
      title: "Philippines wind project",
      description: "Future-dated source",
      publishedAt: "2027-01-01T00:00:00.000Z",
    }, now)).toBe(60);
  });

  it("stores stable keys and explicit scoring methods for observations", () => {
    const now = new Date("2026-11-27T00:20:00.000Z");
    const google = buildGoogleTrendObservations([{
      title: "Philippines solar trend",
      url: "https://trends.google.com/trends/explore?geo=PH",
      approximateTraffic: "5K+",
    }], now);
    expect(google[0].source_type).toBe("google-trends-rss");
    expect(google[0].search_rank).toBe(1);
    expect(google[0].search_volume_label).toBe("5K+");
    expect(google[0].score_method).toBe("google_trends_rank_priority_v1");
    expect(google[0].observed_hour).toBe("2026-11-27T00:00:00.000Z");

    const search = buildSearchObservations([{
      title: "Wind power project Philippines",
      url: "https://example.org/wind-project",
      description: "New project",
      sourceName: "Example News",
      sourceType: "public-webpage",
      provider: "brave",
      publishedAt: "2026-11-26",
    }], PHILIPPINES_TOPIC_GROUPS[0], now);
    expect(search[0].source_type).toBe("brave-search");
    expect(search[0].industry).toBe("energy");
    expect(search[0].score_method).toBe("web_discovery_priority_v1");
    expect(search[0].signal_key).toHaveLength(64);
  });
});
