import { describe, expect, it } from "vitest";
import {
  evaluateNeasRuntimeReadiness,
  NEAS_PRIVILEGED_CAPABILITIES,
  type NeasRuntimeEvidence,
} from "../lib/neas-api-security";

const NOW = Date.parse("2026-11-24T00:00:00.000Z");

function completeEvidence(): NeasRuntimeEvidence[] {
  return NEAS_PRIVILEGED_CAPABILITIES.map((capability) => ({
    capability,
    verified: true,
    verifiedAt: new Date(NOW - 60_000).toISOString(),
    evidenceRef: "test:evidence:" + capability,
  }));
}

describe("NEAS privileged runtime readiness gate", () => {
  it("fails closed when no runtime evidence is supplied", () => {
    const result = evaluateNeasRuntimeReadiness([], NOW);
    expect(result.ready).toBe(false);
    expect(result.verified).toEqual([]);
    expect(result.blocked).toEqual([...NEAS_PRIVILEGED_CAPABILITIES]);
  });

  it("requires explicit fresh evidence for every capability", () => {
    const result = evaluateNeasRuntimeReadiness(completeEvidence(), NOW);
    expect(result.ready).toBe(true);
    expect(result.blocked).toEqual([]);
    expect(result.verified).toEqual([...NEAS_PRIVILEGED_CAPABILITIES]);
  });

  it("blocks unverified and incomplete capabilities", () => {
    const evidence = completeEvidence().filter((item) =>
      item.capability !== "specialist-execution" && item.capability !== "model-live-validation",
    );
    evidence.push({
      capability: "model-live-validation",
      verified: false,
      verifiedAt: new Date(NOW).toISOString(),
      evidenceRef: "test:failed:model",
    });
    const result = evaluateNeasRuntimeReadiness(evidence, NOW);
    expect(result.ready).toBe(false);
    expect(result.blocked).toContain("specialist-execution");
    expect(result.blocked).toContain("model-live-validation");
  });

  it("blocks stale and future-dated evidence", () => {
    const evidence = completeEvidence().map((item) => item.capability === "identity"
      ? { ...item, verifiedAt: new Date(NOW - 16 * 60_000).toISOString() }
      : item.capability === "authorization"
        ? { ...item, verifiedAt: new Date(NOW + 60_000).toISOString() }
        : item);
    const result = evaluateNeasRuntimeReadiness(evidence, NOW);
    expect(result.blocked).toContain("identity");
    expect(result.blocked).toContain("authorization");
  });

  it("rejects duplicate capability evidence rather than choosing a winner", () => {
    const evidence = completeEvidence();
    evidence.push(evidence[0]);
    expect(() => evaluateNeasRuntimeReadiness(evidence, NOW)).toThrow(/Duplicate/);
  });

  it("rejects unknown evidence and invalid clock settings", () => {
    expect(() => evaluateNeasRuntimeReadiness([
      { capability: "not-a-capability" as NeasRuntimeEvidence["capability"], verified: true },
    ], NOW)).toThrow(/Unknown/);
    expect(() => evaluateNeasRuntimeReadiness([], Number.NaN)).toThrow(/clock/);
  });

  it("requires a non-empty evidence reference and valid verification timestamp", () => {
    const evidence = completeEvidence().map((item) => item.capability === "durable-audit"
      ? { ...item, evidenceRef: " " }
      : item.capability === "task-store"
        ? { ...item, verifiedAt: "not-a-date" }
        : item);
    const result = evaluateNeasRuntimeReadiness(evidence, NOW);
    expect(result.blocked).toContain("durable-audit");
    expect(result.blocked).toContain("task-store");
  });
});
