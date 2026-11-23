import { describe, expect, it } from "vitest";
import {
  assertInternalKnowledgeSource,
  buildNeasSystemPolicy,
  classifyNeasAction,
} from "../lib/neas-ai-governance";

describe("NEAS AI CORE governance", () => {
  it("allows approved internal documents", () => {
    expect(() => assertInternalKnowledgeSource({ kind: "internal_document" })).not.toThrow();
  });

  it("allows only explicitly authorized company connectors", () => {
    expect(() => assertInternalKnowledgeSource({ kind: "authorized_connector", authorized: true })).not.toThrow();
    expect(() => assertInternalKnowledgeSource({ kind: "authorized_connector", authorized: false })).toThrow();
  });

  it("blocks public web and unknown knowledge sources", () => {
    expect(() => assertInternalKnowledgeSource({ kind: "public_url" })).toThrow();
    expect(() => assertInternalKnowledgeSource({ kind: "web_search" })).toThrow();
    expect(() => assertInternalKnowledgeSource({ kind: "unknown" })).toThrow();
  });

  it("permits only pre-approved low-risk actions automatically", () => {
    expect(classifyNeasAction("summarize_internal")).toBe("low-risk-preapproved");
    expect(classifyNeasAction("read_only_check")).toBe("low-risk-preapproved");
    expect(classifyNeasAction("send_external")).toBe("human-approval-required");
    expect(classifyNeasAction("issue_quote")).toBe("human-approval-required");
    expect(classifyNeasAction("commit_funds")).toBe("human-approval-required");
    expect(classifyNeasAction("approve_safety")).toBe("human-approval-required");
    expect(classifyNeasAction("change_production")).toBe("human-approval-required");
    expect(classifyNeasAction("public_web_research")).toBe("blocked");
  });

  it("injects the internal-only and limited-autonomy rules into the model system policy", () => {
    const policy = buildNeasSystemPolicy();
    expect(policy).toContain("INTERNAL ONLY");
    expect(policy).toContain("Never browse public websites");
    expect(policy).toContain("Human approval is mandatory");
  });
});
