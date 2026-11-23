import { describe, expect, it } from "vitest";
import {
  buildNeasMasterBrainPlan,
  classifyNeasRequest,
  NEAS_SPECIALISTS,
} from "../lib/neas-ai-orchestrator";

describe("NEAS AI CORE Master Brain planner", () => {
  it("registers the 12 requested specialist domains", () => {
    expect(NEAS_SPECIALISTS).toHaveLength(12);
    expect(NEAS_SPECIALISTS.map((agent) => agent.id)).toContain("legal-compliance");
    expect(NEAS_SPECIALISTS.map((agent) => agent.id)).toContain("renewable-energy");
  });

  it("routes a rope access and safety task to relevant specialists", () => {
    const plan = buildNeasMasterBrainPlan("Prepare a rope access rescue plan and JSA for a wind turbine blade inspection.");
    expect(plan.selectedAgents.map((agent) => agent.id)).toContain("safety");
    expect(plan.selectedAgents.map((agent) => agent.id)).toContain("engineering");
    expect(plan.selectedAgents.map((agent) => agent.id)).toContain("renewable-energy");
  });

  it("routes commercial and business development work", () => {
    const plan = buildNeasMasterBrainPlan("Prepare a BOQ, quotation draft and tender opportunity qualification.");
    expect(plan.selectedAgents.map((agent) => agent.id)).toContain("commercial");
    expect(plan.selectedAgents.map((agent) => agent.id)).toContain("business-development");
    expect(plan.approval).toBe("human-approval-required");
  });

  it("blocks public web research under internal-only policy", () => {
    expect(classifyNeasRequest("Do public web search for new tenders")).toBe("blocked");
  });

  it("does not permit execution from a planning result", () => {
    const plan = buildNeasMasterBrainPlan("Analyze our internal project progress and prepare a report.");
    expect(plan.executionAllowed).toBe(false);
    expect(plan.executionMode).toBe("analysis-and-draft-only");
    expect(plan.knowledgeMode).toBe("internal-only");
  });

  it("validates objective and agent count", () => {
    expect(() => buildNeasMasterBrainPlan("   ")).toThrow();
    expect(() => buildNeasMasterBrainPlan("Review project", 0)).toThrow();
    expect(() => buildNeasMasterBrainPlan("Review project", 6)).toThrow();
  });
});
