import { describe, expect, it } from "vitest";
import { createNeasCmsSignature, resolveNeasCmsEndpoint } from "../lib/giie-cms-client";

describe("NEAS CMS connector signing", () => {
  it("creates a stable SHA-256 HMAC for the timestamp, request id and exact body", () => {
    const body = JSON.stringify({ signalId: "signal-12345678" });
    const signature = createNeasCmsSignature(
      "a-test-secret-that-is-at-least-32-characters",
      "1795800000",
      "6c1d4a90-b1c3-4c56-8f6c-a4b7a3f1e210",
      body,
    );
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(signature).toBe(createNeasCmsSignature(
      "a-test-secret-that-is-at-least-32-characters",
      "1795800000",
      "6c1d4a90-b1c3-4c56-8f6c-a4b7a3f1e210",
      body,
    ));
  });

  it("rejects non-HTTPS, foreign-host and wrong-path endpoints", () => {
    expect(() => resolveNeasCmsEndpoint("http://www.nextedge-access-solutions.com/api/integrations/giie/commercial-briefs")).toThrow();
    expect(() => resolveNeasCmsEndpoint("https://attacker.example/api/integrations/giie/commercial-briefs")).toThrow();
    expect(() => resolveNeasCmsEndpoint("https://www.nextedge-access-solutions.com/api/admin/delete")).toThrow();
  });

  it("accepts only the canonical production CMS integration endpoint", () => {
    expect(resolveNeasCmsEndpoint("https://www.nextedge-access-solutions.com/api/integrations/giie/commercial-briefs").hostname)
      .toBe("www.nextedge-access-solutions.com");
  });
});
