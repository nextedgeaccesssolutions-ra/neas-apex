import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { consumeRateLimit, isSameOriginBrowserRequest } from "@/lib/neas-api-security";

describe("NEAS API request security", () => {
  it("accepts a same-origin browser request", () => {
    const request = new NextRequest("https://neas.example/api/ai/chat", {
      headers: {
        host: "neas.example",
        origin: "https://neas.example",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isSameOriginBrowserRequest(request)).toBe(true);
  });

  it("rejects a cross-origin request", () => {
    const request = new NextRequest("https://neas.example/api/ai/chat", {
      headers: {
        host: "neas.example",
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(isSameOriginBrowserRequest(request)).toBe(false);
  });

  it("rejects malformed origins, missing origins, and requests without a host", () => {
    const malformed = new NextRequest("https://neas.example/api/ai/chat", {
      headers: { host: "neas.example", origin: "not-a-url" },
    });
    const missingOrigin = new NextRequest("https://neas.example/api/ai/chat", {
      headers: { host: "neas.example", "sec-fetch-site": "same-origin" },
    });
    const missingHost = new NextRequest("https://neas.example/api/ai/chat", {
      headers: { origin: "https://neas.example" },
    });
    expect(isSameOriginBrowserRequest(malformed)).toBe(false);
    expect(isSameOriginBrowserRequest(missingOrigin)).toBe(false);
    expect(isSameOriginBrowserRequest(missingHost)).toBe(false);
  });

  it("enforces a per-client window and resets after expiry", () => {
    const request = new NextRequest("https://neas.example/api/ai/chat", {
      headers: {
        host: "neas.example",
        origin: "https://neas.example",
        "x-forwarded-for": "198.51.100.41",
      },
    });
    expect(consumeRateLimit(request, "test-ai-chat", 2, 1_000, 10_000).allowed).toBe(true);
    expect(consumeRateLimit(request, "test-ai-chat", 2, 1_000, 10_100).allowed).toBe(true);
    const blocked = consumeRateLimit(request, "test-ai-chat", 2, 1_000, 10_200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(consumeRateLimit(request, "test-ai-chat", 2, 1_000, 11_100).allowed).toBe(true);
  });

  it("rejects invalid limiter configuration instead of silently accepting it", () => {
    const request = new NextRequest("https://neas.example/api/ai/chat", {
      headers: { host: "neas.example", origin: "https://neas.example" },
    });
    expect(() => consumeRateLimit(request, "", 1, 1_000, 1)).toThrow("namespace");
    expect(() => consumeRateLimit(request, "invalid-limit", 0, 1_000, 1)).toThrow("positive safe integer");
    expect(() => consumeRateLimit(request, "invalid-window", 1, 0, 1)).toThrow("positive finite number");
    expect(() => consumeRateLimit(request, "invalid-clock", 1, 1_000, Number.NaN)).toThrow("finite");
  });

  it("fails closed when the process-local bucket table reaches its hard capacity", () => {
    const namespace = "capacity-test-" + Math.random().toString(36).slice(2);
    let blocked = false;
    for (let index = 0; index < 10_001; index += 1) {
      const request = new NextRequest("https://neas.example/api/ai/chat", {
        headers: {
          host: "neas.example",
          origin: "https://neas.example",
          "x-forwarded-for": "192.0.2." + index,
        },
      });
      const result = consumeRateLimit(request, namespace, 1, 60_000, 50_000);
      if (!result.allowed) {
        blocked = true;
        expect(result.retryAfterSeconds).toBe(1);
        break;
      }
    }
    expect(blocked).toBe(true);
  });
});
