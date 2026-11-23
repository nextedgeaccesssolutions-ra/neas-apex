export type NeasGatewayAuthMode = "api_key" | "vercel_oidc" | "unavailable";

export function getNeasGatewayAuthMode(env: {
  AI_GATEWAY_API_KEY?: string;
  VERCEL?: string;
}): NeasGatewayAuthMode {
  if (env.AI_GATEWAY_API_KEY?.trim()) return "api_key";
  if (env.VERCEL === "1") return "vercel_oidc";
  return "unavailable";
}

export function isSafeGatewayModelId(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 160
    && /^[a-z0-9][a-z0-9_-]{0,63}\/[a-z0-9][a-z0-9._-]{0,95}$/i.test(value);
}

export function normalizeModelProbeTimeout(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 15_000;
  return Math.min(30_000, Math.max(5_000, Math.floor(value)));
}
