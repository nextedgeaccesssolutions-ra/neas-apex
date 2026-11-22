import { describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  isSameOriginBrowserRequest,
} from "../../lib/neas-api-security";

function request(headers: Record<string, string>) {
  return {
    headers: new Headers(headers),
  } as Parameters<typeof isSameOriginBrowserRequest>[0];
}

describe("NEAS API request security", () => {
  it("accepts a same-origin browser request", () => {
    expect(
      isSameOriginBrowserRequest(
        request({
          host: "neas-apex.vercel.app",
          origin: "https://neas-apex.vercel.app",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("rejects a cross-origin browser request", () => {
    expect(
      isSameOriginBrowserRequest(
        request({
          host: "neas-apex.vercel.app",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("rejects an explicitly cross-site fetch even when Origin matches", () => {
    expect(
      isSameOriginBrowserRequest(
        request({
          host: "neas-apex.vercel.app",
          origin: "https://neas-apex.vercel.app",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });


  it("rejects malformed origins", () => {
    expect(
      isSameOriginBrowserRequest(
        request({
          host: "neas-apex.vercel.app",
          origin: "not-a-url",
        }),
      ),
    ).toBe(false);
  });

  it("rejects requests without a host", () => {
    expect(isSameOriginBrowserRequest(request({ origin: "https://neas-apex.vercel.app" }))).toBe(false);
  });

  it("enforces a fixed-window rate limit and resets after the window", () => {
    const req = request({
      host: "neas-apex.vercel.app",
      "x-forwarded-for": "198.51.100.77",
    });

    expect(consumeRateLimit(req, "neas-test", 2, 2000, 1000).allowed).toBe(true);
    expect(consumeRateLimit(req, "neas-test", 2, 2000, 1000).allowed).toBe(true);

    const blocked = consumeRateLimit(req, "neas-test", 2, 2000, 1500);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(2);

    expect(consumeRateLimit(req, "neas-test", 2, 2000, 3000).allowed).toBe(true);
  });
});
