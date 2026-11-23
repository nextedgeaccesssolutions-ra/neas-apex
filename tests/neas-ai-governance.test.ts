import { describe, expect, it } from "vitest";
import {
  assertInternalKnowledgeSource,
  assertNeasKnowledgeSource,
  buildNeasSystemPolicy,
  classifyNeasAction,
} from "../lib/neas-ai-governance";

describe("NEAS AI CORE governance", () => {
  it("allows approved internal documents and authorized connectors", () => {
    expect(() => assertInternalKnowledgeSource({ kind: "internal_document" })).not.toThrow();
    expect(() => assertInternalKnowledgeSource({ kind: "authorized_connector", authorized: true })).not.toThrow();
    expect(() => assertInternalKnowledgeSource({ kind: "authorized_connector", authorized: false })).toThrow();
  });

  it("allows public sources only through the separate GIIE knowledge space", () => {
    expect(() => assertNeasKnowledgeSource({ kind: "public_url", knowledgeSpace: "public-global-intelligence", viaGiie: true })).not.toThrow();
    expect(() => assertNeasKnowledgeSource({ kind: "web_search", knowledgeSpace: "public-global-intelligence", viaGiie: true })).not.toThrow();
    expect(() => assertNeasKnowledgeSource({ kind: "public_url" })).toThrow();
    expect(() => assertNeasKnowledgeSource({ kind: "web_search", knowledgeSpace: "internal", viaGiie: true })).toThrow();
    expect(() => assertNeasKnowledgeSource({ kind: "unknown" })).toThrow();
  });

  it("keeps external actions and commercial implementation approval-gated", () => {
    expect(classifyNeasAction("summarize_internal")).toBe("low-risk-preapproved");
    expect(classifyNeasAction("read_only_check")).toBe("low-risk-preapproved");
    expect(classifyNeasAction("public_web_research")).toBe("low-risk-preapproved");
    expect(classifyNeasAction("send_external")).toBe("human-approval-required");
    expect(classifyNeasAction("issue_quote")).toBe("human-approval-required");
    expect(classifyNeasAction("commit_funds")).toBe("human-approval-required");
    expect(classifyNeasAction("approve_safety")).toBe("human-approval-required");
    expect(classifyNeasAction("change_production")).toBe("human-approval-required");
    expect(classifyNeasAction("commercialize_opportunity")).toBe("human-approval-required");
  });

  it("describes the dual-separated knowledge spaces and limited autonomy", () => {
    const policy = buildNeasSystemPolicy();
    expect(policy).toContain("two strictly separated knowledge spaces");
    expect(policy).toContain("GIIE subsystem");
    expect(policy).toContain("Human approval is mandatory");
    expect(policy).toContain("Never bypass paywalls");
  });
});
