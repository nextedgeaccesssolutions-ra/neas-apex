import { describe, expect, it } from "vitest";
import type { GiieSearchResult } from "../lib/giie-connectors";
import {
  buildCommercialSignals,
  classifyCommercialIndustry,
  classifyCommercialSignal,
  COMMERCIAL_TOPIC_GROUPS,
  evaluateAutoPublication,
  getHourlyCommercialTopicGroup,
  scoreCommercialSignal,
} from "../lib/giie-commercial";

const result = (
  overrides: Partial<GiieSearchResult> = {},
): GiieSearchResult => ({
  title: "Philippines DOE offshore wind project procurement tender",
  url: "https://doe.gov.ph/project/offshore-wind",
  description:
    "Government invitation to bid for a new offshore wind power project.",
  sourceName: "Department of Energy",
  sourceType: "government",
  publishedAt: "2026-11-26T00:00:00.000Z",
  provider: "brave",
  ...overrides,
});

describe("NEAS commercial intelligence coverage", () => {
  it("rotates across all commercial industry groups each UTC hour", () => {
    const visited = new Set(
      Array.from(
        { length: COMMERCIAL_TOPIC_GROUPS.length },
        (_, hour) =>
          getHourlyCommercialTopicGroup(new Date(Date.UTC(2026, 10, 27, hour)))
            .id,
      ),
    );
    expect(visited.size).toBe(COMMERCIAL_TOPIC_GROUPS.length);
  });

  it.each([
    ["offshore wind turbine project investment", "energy"],
    ["bridge and rail infrastructure construction", "construction"],
    ["semiconductor manufacturing factory", "manufacturing"],
    ["Philippines fisheries and aquaculture", "agriculture"],
    ["hotel tourism resort", "tourism"],
    ["shipping port logistics", "transport-logistics"],
    ["AI data center telecom", "technology"],
    ["banking fintech retail", "finance-commerce"],
    ["hospital medical device", "healthcare"],
    ["technical training workforce skills", "education"],
    ["government procurement PhilGEPS tender", "government"],
    ["climate resilience water management", "environment"],
  ])("classifies %s", (input, expected) => {
    expect(classifyCommercialIndustry(input)).toBe(expected);
  });

  it.each([
    ["PhilGEPS invitation to bid procurement", "tender-procurement"],
    ["DOE announces notice of award to contractor", "contract-award"],
    ["New 300 MW renewable power investment project", "project-investment"],
    ["Power plant outage maintenance and inspection", "asset-maintenance"],
    ["Factory expansion new facility", "business-expansion"],
    ["Hiring technicians and engineers", "workforce-demand"],
  ])("classifies commercial signal %s", (input, expected) => {
    expect(classifyCommercialSignal(input)).toBe(expected);
  });
});

describe("commercial signal scoring and normalization", () => {
  it("prioritizes recent official procurement signals over generic unverified listings", () => {
    const now = new Date("2026-11-27T00:00:00.000Z");
    const official = scoreCommercialSignal(result(), now);
    const generic = scoreCommercialSignal(
      result({
        title: "General business news",
        url: "https://example.com/news",
        description:
          "A general company update with no project or procurement detail.",
        publishedAt: undefined,
      }),
      now,
    );
    expect(official.signalType).toBe("tender-procurement");
    expect(official.score).toBeGreaterThan(generic.score);
    expect(official.basis.sourceAuthority).toBe(15);
    expect(official.basis.freshness).toBe(10);
  });

  it("does not award a freshness bonus for future-dated sources", () => {
    const now = new Date("2026-11-27T00:00:00.000Z");
    const score = scoreCommercialSignal(
      result({ publishedAt: "2027-01-01T00:00:00.000Z" }),
      now,
    );
    expect(score.basis.freshness).toBe(0);
  });

  it("deduplicates normalized URLs and rejects insecure or credential-bearing URLs", () => {
    const rows = buildCommercialSignals(
      [
        result(),
        result({ url: "https://doe.gov.ph/project/offshore-wind#section" }),
        result({ url: "http://example.com/insecure" }),
        result({ url: "https://user:pass@example.com/private" }),
      ],
      COMMERCIAL_TOPIC_GROUPS[0],
      new Date("2026-11-27T00:00:00.000Z"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].verification_status).toBe("unverified");
    expect(rows[0].publication_status).toBe("blocked_unverified");
    expect(rows[0].score_method).toBe("commercial_opportunity_priority_v1");
    expect(rows[0].signal_key).toHaveLength(64);
    expect(rows[0].industry).toBe("energy");
  });
});

describe("automatic publishing policy", () => {
  it("allows only verified, corroborated, cited informational market summaries", () => {
    expect(
      evaluateAutoPublication({
        evidenceClass: "verified-official",
        independentSourceCount: 2,
        contentType: "market-summary",
        hasSourceCitations: true,
      }).eligible,
    ).toBe(true);
  });

  it.each([
    "company-claim",
    "pricing",
    "tender",
    "safety-guidance",
    "customer-communication",
  ] as const)("blocks sensitive content type %s", (contentType) => {
    expect(
      evaluateAutoPublication({
        evidenceClass: "verified-official",
        independentSourceCount: 3,
        contentType,
        hasSourceCitations: true,
      }).eligible,
    ).toBe(false);
  });

  it("blocks unverified or single-source material even when auto publishing is enabled", () => {
    expect(
      evaluateAutoPublication({
        evidenceClass: "unverified-claim",
        independentSourceCount: 5,
        contentType: "market-summary",
        hasSourceCitations: true,
      }).eligible,
    ).toBe(false);
    expect(
      evaluateAutoPublication({
        evidenceClass: "verified-official",
        independentSourceCount: 1,
        contentType: "market-summary",
        hasSourceCitations: true,
      }).eligible,
    ).toBe(false);
  });
});
