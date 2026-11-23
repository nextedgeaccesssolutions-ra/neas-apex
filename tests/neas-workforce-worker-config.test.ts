import { describe, expect, it } from "vitest";
import { getNeasWorkerConfigStatus } from "@/lib/neas-workforce-worker-config";

const completeEnv = {
  WORKFORCE_WORKER_ENABLED: "true",
  CRON_SECRET: "x".repeat(48),
  GEMINI_API_KEY: "test-gemini-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  SUPABASE_URL: "https://example-project.supabase.co",
};

describe("NEAS workforce worker configuration", () => {
  it("accepts complete server configuration without returning secrets", () => {
    const result = getNeasWorkerConfigStatus(completeEnv);
    expect(result).toEqual({ configured: true, missing: [] });
    expect(JSON.stringify(result)).not.toContain("test-gemini-key");
    expect(JSON.stringify(result)).not.toContain("test-service-role-key");
  });

  it("fails closed when the worker feature flag is disabled", () => {
    expect(getNeasWorkerConfigStatus({ ...completeEnv, WORKFORCE_WORKER_ENABLED: "false" }))
      .toEqual({ configured: false, missing: ["WORKFORCE_WORKER_ENABLED"] });
  });

  it("requires a sufficiently long cron secret", () => {
    expect(getNeasWorkerConfigStatus({ ...completeEnv, CRON_SECRET: "short" }).missing)
      .toContain("CRON_SECRET");
  });

  it("rejects non-HTTPS and non-Supabase database URLs", () => {
    expect(getNeasWorkerConfigStatus({ ...completeEnv, SUPABASE_URL: "http://example-project.supabase.co" }).missing)
      .toContain("SUPABASE_URL");
    expect(getNeasWorkerConfigStatus({ ...completeEnv, SUPABASE_URL: "https://supabase.co.attacker.example" }).missing)
      .toContain("SUPABASE_URL");
  });

  it("requires all server-side credentials before task admission", () => {
    const result = getNeasWorkerConfigStatus({
      ...completeEnv,
      GEMINI_API_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });
    expect(result.configured).toBe(false);
    expect(result.missing).toEqual(["GEMINI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
  });
});
