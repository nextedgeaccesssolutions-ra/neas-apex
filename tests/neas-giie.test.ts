import { describe, expect, it } from "vitest";
import {
  classifyEvidence,
  GIIE_GOVERNANCE,
  GIIE_PIPELINE,
  GIIE_RESEARCH_AGENTS,
  isIndependentCorroboration,
  scoreNeasRelevance,
  validatePublicDiscovery,
  type GiieDiscovery,
} from "../lib/neas-giie";

const discovery: GiieDiscovery = {
  id: "test-1",
  knowledgeSpace: "public-global-intelligence",
  title: "Public wind inspection innovation",
  sourceUrl: "https://example.org/research/wind-inspection",
  sourceName: "Example Research Institute",
  sourceType: "peer-reviewed-journal",
  discoveredAt: "2026-11-24T00:00:00Z",
  subjects: ["wind", "inspection"],
  coreConcept: "A novel inspection method",
  industries: ["wind energy"],
  evidenceClass: "peer-reviewed-research",
  status: "verification-pending",
  lawfulSummary: "Short attributed summary of the discovery.",
  relatedDiscoveryIds: [],
  corroboratingSourceUrls: [],
  contradictionNotes: [],
  confidence: 0.65,
};

describe("NEAS GIIE governance and intelligence primitives", () => {
  it("registers all twelve global research roles", () => {
    expect(GIIE_RESEARCH_AGENTS).toHaveLength(12);
  });

  it("keeps public research separate from internal company knowledge", () => {
    expect(GIIE_GOVERNANCE.publicAndInternalKnowledgeMustRemainSeparate).toBe(true);
    expect(validatePublicDiscovery({ ...discovery, knowledgeSpace: "confidential-neas-internal" as never })).toContain(
      "Public discoveries must remain in the public-global-intelligence knowledge space.",
    );
  });

  it("validates source provenance and confidence", () => {
    expect(validatePublicDiscovery(discovery)).toEqual([]);
    expect(validatePublicDiscovery({ ...discovery, sourceUrl: "javascript:alert(1)", confidence: 1.5 }).length).toBeGreaterThan(0);
  });

  it("rejects malformed discovery payloads without throwing", () => {
    expect(validatePublicDiscovery(null as unknown as GiieDiscovery)).toContain("Discovery payload must be an object.");
    const malformed = {
      ...discovery,
      title: undefined,
      sourceName: 42,
      subjects: "wind",
      industries: [""],
      sourceType: "unknown",
      confidence: Number.NaN,
    } as unknown as GiieDiscovery;
    const errors = validatePublicDiscovery(malformed);
    expect(errors).toContain("Discovery title is required.");
    expect(errors).toContain("Source name is required.");
    expect(errors).toContain("Subjects must be an array of up to 50 non-empty text values.");
    expect(errors).toContain("Unsupported GIIE source type.");
    expect(errors).toContain("Confidence must be between 0 and 1.");
  });

  it("rejects credential-bearing source URLs and invalid required dates", () => {
    const errors = validatePublicDiscovery({
      ...discovery,
      sourceUrl: "https://user:pass@example.org/feed",
      discoveredAt: "not-a-date",
    });
    expect(errors).toContain("Source URL must not contain credentials.");
    expect(errors).toContain("discoveredAt must be a valid date.");
  });

  it("classifies evidence without promoting unverified claims", () => {
    expect(classifyEvidence({ officialPrimarySource: true, verified: true })).toBe("verified-official");
    expect(classifyEvidence({ peerReviewed: true })).toBe("peer-reviewed-research");
    expect(classifyEvidence({ credibleIndependentSources: 2 })).toBe("credible-secondary");
    expect(classifyEvidence({ opinionOrForum: true })).toBe("industry-opinion");
    expect(classifyEvidence({})).toBe("unverified-claim");
  });

  it("requires independent source domains for corroboration", () => {
    expect(isIndependentCorroboration(["https://a.example.org/x", "https://www.a.example.org/y"])).toBe(false);
    expect(isIndependentCorroboration(["https://a.example.org/x", "https://b.example.net/y"])).toBe(true);
  });

  it("scores relevance with bounded inputs", () => {
    expect(scoreNeasRelevance({ industryMatch: 100, geographyMatch: 100, credibility: 100, commercialValue: 100, urgency: 100, feasibility: 100 })).toBe(100);
    expect(() => scoreNeasRelevance({ industryMatch: 101, geographyMatch: 0, credibility: 0, commercialValue: 0, urgency: 0, feasibility: 0 })).toThrow();
  });

  it("contains the full discovery-to-measurement pipeline", () => {
    expect(GIIE_PIPELINE[0]).toBe("discover");
    expect(GIIE_PIPELINE.at(-1)).toBe("measure");
    expect(GIIE_GOVERNANCE.neverBypassPaywallsAuthenticationCaptchaOrAccessControls).toBe(true);
  });
});
