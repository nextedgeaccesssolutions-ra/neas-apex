import { describe, expect, it } from "vitest";
import {
  buildNeasMasterBrainPlan,
  classifyNeasRequest,
  NEAS_SPECIALISTS,
  decideNeasTaskExecution,
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


describe("NEAS task execution policy contract", () => {
  const safeContext = {
    authenticatedPrincipalId: "test-owner",
    durableAuditAvailable: true,
    idempotencyKey: "test-task-001",
    scopedToolGrantAvailable: true,
  };

  it.each(["summarize_internal", "draft_internal", "plan_tasks", "read_only_check", "giie_public_research"] as const)(
    "allows only preapproved bounded operation %s when controls are present",
    (operation) => {
      const result = decideNeasTaskExecution(operation, safeContext);
      expect(result.disposition).toBe("queue_preapproved");
      expect(result.requiresAuthenticatedPrincipal).toBe(true);
      expect(result.requiresDurableAudit).toBe(true);
      expect(result.requiresIdempotencyKey).toBe(true);
      expect(result.requiresScopedToolGrant).toBe(true);
    },
  );

  it.each(["send_external", "issue_quote", "commit_funds", "change_production", "mutate_business_record", "commercialize_opportunity"] as const)(
    "holds operation %s for human approval",
    (operation) => {
      const result = decideNeasTaskExecution(operation, safeContext);
      expect(result.disposition).toBe("await_human_approval");
      expect(result.requiresHumanApproval).toBe(true);
      expect(decideNeasTaskExecution(operation, { ...safeContext, humanApprovalGranted: true }).disposition).toBe("queue_preapproved");
    },
  );

  it.each(["approve_safety", "arbitrary_shell", "arbitrary_filesystem", "arbitrary_network"] as const)(
    "denies prohibited operation %s even when controls are present",
    (operation) => {
      expect(decideNeasTaskExecution(operation, safeContext).disposition).toBe("deny");
    },
  );

  it("fails closed without an authenticated principal, durable audit, idempotency, or scoped grant", () => {
    expect(decideNeasTaskExecution("draft_internal", { ...safeContext, authenticatedPrincipalId: null }).disposition).toBe("deny");
    expect(decideNeasTaskExecution("draft_internal", { ...safeContext, durableAuditAvailable: false }).disposition).toBe("deny");
    expect(decideNeasTaskExecution("draft_internal", { ...safeContext, idempotencyKey: "" }).disposition).toBe("deny");
    expect(decideNeasTaskExecution("draft_internal", { ...safeContext, scopedToolGrantAvailable: false }).disposition).toBe("deny");
  });

  it("does not let human approval override denied safety or arbitrary execution", () => {
    expect(decideNeasTaskExecution("approve_safety", { ...safeContext, humanApprovalGranted: true }).disposition).toBe("deny");
    expect(decideNeasTaskExecution("arbitrary_shell", { ...safeContext, humanApprovalGranted: true }).disposition).toBe("deny");
  });
});
