import { describe, expect, it } from "vitest";
import { normalizeSourceUrl, validateGiieSourceRegistration, validateGiieSourceReview } from "../lib/giie-store";

describe("NEAS GIIE public source URL normalization", () => {
  it("normalizes host case and removes fragments and trailing path slashes", () => {
    expect(normalizeSourceUrl("https://WWW.Example.org/research///#section")).toBe("https://www.example.org/research");
  });

  it("rejects non-http protocols", () => {
    expect(() => normalizeSourceUrl("javascript:alert(1)")).toThrow();
  });
});


describe("NEAS GIIE source registry governance", () => {
  it("accepts only HTTPS public source registrations", () => {
    expect(validateGiieSourceRegistration({
      sourceUrl: "https://www.example.org/feed.xml",
      sourceName: "Example Research Feed",
      sourceType: "rss",
    }).normalizedUrl).toBe("https://www.example.org/feed.xml");

    expect(() => validateGiieSourceRegistration({
      sourceUrl: "http://example.org/feed.xml",
      sourceName: "Example Research Feed",
      sourceType: "rss",
    })).toThrow(/HTTPS/);
  });

  it("rejects local, IP-address, credential-bearing and unsupported sources", () => {
    for (const sourceUrl of [
      "https://localhost/feed.xml",
      "https://192.0.2.1/feed.xml",
      "https://user:pass@example.org/feed.xml",
    ]) {
      expect(() => validateGiieSourceRegistration({
        sourceUrl,
        sourceName: "Example Feed",
        sourceType: "rss",
      })).toThrow();
    }
    expect(() => validateGiieSourceRegistration({
      sourceUrl: "https://example.org/feed.xml",
      sourceName: "Example Feed",
      sourceType: "unknown",
    })).toThrow(/Unsupported/);
  });

  it("requires a documented terms and robots review before enabling a source", () => {
    const reviewed = {
      termsReviewed: true,
      robotsReviewed: true,
      enabled: true,
      quotaPerHour: 10,
      reviewNote: "Reviewed publisher terms and robots policy; public feed use is permitted.",
    };
    expect(validateGiieSourceReview(reviewed)).toContain("Reviewed");
    expect(() => validateGiieSourceReview({ ...reviewed, termsReviewed: false })).toThrow(/cannot be enabled/);
    expect(() => validateGiieSourceReview({ ...reviewed, robotsReviewed: false })).toThrow(/cannot be enabled/);
    expect(() => validateGiieSourceReview({ ...reviewed, quotaPerHour: 0 })).toThrow(/cannot be enabled/);
    expect(() => validateGiieSourceReview({ ...reviewed, reviewNote: "ok" })).toThrow(/review note/);
    expect(() => validateGiieSourceReview({ ...reviewed, quotaPerHour: 1001 })).toThrow(/quota/);
  });
});
