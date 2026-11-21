import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "../lib/neas-api-security";

describe("NEAS API request security", () => {
  it("accepts a same-origin browser request", () => {
    const request = new NextRequest("https://neas.example/api/elevenlabs/token", {
      headers: {
        host: "neas.example",
        origin: "https://neas.example",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isSameOriginBrowserRequest(request)).toBe(true);
  });

  it("rejects a cross-origin request", () => {
    const request = new NextRequest("https://neas.example/api/elevenlabs/token", {
      headers: {
        host: "neas.example",
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(isSameOriginBrowserRequest(request)).toBe(false);
  });

  it("rejects malformed origins and requests without a host", () => {
    const malformed = new NextRequest("https://neas.example/api/elevenlabs/token", {
      headers: { host: "neas.example", origin: "not-a-url" },
    });
    const missingHost = new NextRequest("https://neas.example/api/elevenlabs/token", {
      headers: { origin: "https://neas.example" },
    });
    expect(isSameOriginBrowserRequest(malformed)).toBe(false);
    expect(isSameOriginBrowserRequest(missingHost)).toBe(false);
  });

  it("enforces a per-client window and resets after expiry", () => {
    const request = new NextRequest("https://neas.example/api/elevenlabs/token", {
      headers: { host: "neas.example", "x-forwarded-for": "198.51.100.41" },
    });
    expect(consumeRateLimit(request, "test-voice", 2, 1_000, 10_000).allowed).toBe(true);
    expect(consumeRateLimit(request, "test-voice", 2, 1_000, 10_100).allowed).toBe(true);
    const blocked = consumeRateLimit(request, "test-voice", 2, 1_000, 10_200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(consumeRateLimit(request, "test-voice", 2, 1_000, 11_100).allowed).toBe(true);
  });
});
