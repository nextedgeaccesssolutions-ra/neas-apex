import { describe, expect, it } from "vitest";
import {
  getNeasGatewayAuthMode,
  isSafeGatewayModelId,
  normalizeModelProbeTimeout,
} from "@/lib/neas-model-router";

describe("NEAS AI Gateway model probe configuration", () => {
  it("prefers an explicit API key and supports Vercel OIDC fallback", () => {
    expect(getNeasGatewayAuthMode({ AI_GATEWAY_API_KEY: "configured", VERCEL: "1" })).toBe("api_key");
    expect(getNeasGatewayAuthMode({ VERCEL: "1" })).toBe("vercel_oidc");
    expect(getNeasGatewayAuthMode({ VERCEL: "0" })).toBe("unavailable");
  });

  it("accepts only bounded provider/model identifiers", () => {
    expect(isSafeGatewayModelId("openai/gpt-4o-mini")).toBe(true);
    expect(isSafeGatewayModelId("google/gemini-2.5-flash")).toBe(true);
    expect(isSafeGatewayModelId("https://example.com/model")).toBe(false);
    expect(isSafeGatewayModelId("model-without-provider")).toBe(false);
    expect(isSafeGatewayModelId("openai/../secret")).toBe(false);
    expect(isSafeGatewayModelId("x".repeat(200))).toBe(false);
  });

  it("clamps probe timeout to safe bounds", () => {
    expect(normalizeModelProbeTimeout(15_000)).toBe(15_000);
    expect(normalizeModelProbeTimeout(1)).toBe(5_000);
    expect(normalizeModelProbeTimeout(100_000)).toBe(30_000);
    expect(normalizeModelProbeTimeout(Number.NaN)).toBe(15_000);
  });
});
