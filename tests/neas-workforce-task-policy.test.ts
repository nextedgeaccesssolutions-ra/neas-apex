import { describe, expect, it } from "vitest";
import type { NeasTaskExecutionDecision } from "@/lib/neas-ai-orchestrator";
import {
  getNeasApprovalCategory,
  getNeasTaskInitialStatus,
  hasNeasTaskControlGrant,
  isNeasTaskOperation,
} from "@/lib/neas-workforce-task-policy";

const validGrant = {
  tools: ["neas_workforce_read", "neas_task_update", "neas_audit_append"],
  permissions: {
    read: ["workforce", "assigned_tasks", "approved_knowledge"],
    write: ["assigned_task_status", "task_comments"],
    safety_signoff: false,
    external_actions: false,
    financial_actions: false,
    production_deploy: false,
  },
};

describe("NEAS workforce task admission policy", () => {
  it("recognizes only declared task operations", () => {
    expect(isNeasTaskOperation("draft_internal")).toBe(true);
    expect(isNeasTaskOperation("approve_safety")).toBe(true);
    expect(isNeasTaskOperation("shell_exec")).toBe(false);
    expect(isNeasTaskOperation(null)).toBe(false);
  });

  it("requires all three task-control tools and read/write scopes", () => {
    expect(hasNeasTaskControlGrant(validGrant)).toBe(true);
    expect(hasNeasTaskControlGrant({ ...validGrant, tools: ["neas_workforce_read"] })).toBe(false);
    expect(hasNeasTaskControlGrant({
      ...validGrant,
      permissions: { ...validGrant.permissions, write: ["task_comments"] },
    })).toBe(false);
    expect(hasNeasTaskControlGrant({ tools: "neas_workforce_read", permissions: {} })).toBe(false);
  });

  it("maps every external side-effect class to an approval category", () => {
    expect(getNeasApprovalCategory("send_external")).toBe("external_communication");
    expect(getNeasApprovalCategory("issue_quote")).toBe("contract");
    expect(getNeasApprovalCategory("commit_funds")).toBe("payment");
    expect(getNeasApprovalCategory("change_production")).toBe("production_deploy");
    expect(getNeasApprovalCategory("mutate_business_record")).toBe("other");
    expect(getNeasApprovalCategory("commercialize_opportunity")).toBe("other");
    expect(getNeasApprovalCategory("draft_internal")).toBeNull();
  });

  it("keeps preapproved internal tasks blocked until a real worker exists", () => {
    const decision: NeasTaskExecutionDecision = {
      disposition: "queue_preapproved",
      operation: "draft_internal",
      requiresAuthenticatedPrincipal: true,
      requiresDurableAudit: true,
      requiresIdempotencyKey: true,
      requiresScopedToolGrant: true,
      requiresHumanApproval: false,
      reason: "test",
    };
    expect(getNeasTaskInitialStatus(decision)).toBe("blocked");
  });

  it("holds external side effects for approval", () => {
    const decision: NeasTaskExecutionDecision = {
      disposition: "await_human_approval",
      operation: "send_external",
      requiresAuthenticatedPrincipal: true,
      requiresDurableAudit: true,
      requiresIdempotencyKey: true,
      requiresScopedToolGrant: true,
      requiresHumanApproval: true,
      reason: "approval required",
    };
    expect(getNeasTaskInitialStatus(decision)).toBe("needs_approval");
  });
});
