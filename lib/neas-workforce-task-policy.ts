import type { NeasTaskOperation, NeasTaskExecutionDecision } from "@/lib/neas-ai-orchestrator";

export type NeasApprovalCategory =
  | "external_communication"
  | "contract"
  | "payment"
  | "production_deploy"
  | "security_policy"
  | "other";

export const NEAS_TASK_OPERATIONS: readonly NeasTaskOperation[] = [
  "summarize_internal",
  "draft_internal",
  "plan_tasks",
  "read_only_check",
  "giie_public_research",
  "send_external",
  "issue_quote",
  "commit_funds",
  "approve_safety",
  "change_production",
  "mutate_business_record",
  "commercialize_opportunity",
  "arbitrary_shell",
  "arbitrary_filesystem",
  "arbitrary_network",
] as const;

const APPROVAL_CATEGORIES: Partial<Record<NeasTaskOperation, NeasApprovalCategory>> = {
  send_external: "external_communication",
  issue_quote: "contract",
  commit_funds: "payment",
  change_production: "production_deploy",
  mutate_business_record: "other",
  commercialize_opportunity: "other",
};

export function isNeasTaskOperation(value: unknown): value is NeasTaskOperation {
  return typeof value === "string" && NEAS_TASK_OPERATIONS.includes(value as NeasTaskOperation);
}

export function getNeasApprovalCategory(operation: NeasTaskOperation): NeasApprovalCategory | null {
  return APPROVAL_CATEGORIES[operation] ?? null;
}

export function getNeasTaskInitialStatus(
  decision: NeasTaskExecutionDecision,
): "blocked" | "needs_approval" {
  return decision.disposition === "await_human_approval" ? "needs_approval" : "blocked";
}

export interface NeasAgentTaskGrant {
  tools: unknown;
  permissions: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Verify only the existing least-privilege task-control tools, never a user-supplied grant. */
export function hasNeasTaskControlGrant(agent: NeasAgentTaskGrant): boolean {
  if (!Array.isArray(agent.tools) || !isRecord(agent.permissions)) return false;
  const read = agent.permissions.read;
  const write = agent.permissions.write;
  return agent.tools.includes("neas_workforce_read")
    && agent.tools.includes("neas_task_update")
    && agent.tools.includes("neas_audit_append")
    && Array.isArray(read)
    && read.includes("workforce")
    && read.includes("assigned_tasks")
    && Array.isArray(write)
    && write.includes("assigned_task_status")
    && write.includes("task_comments");
}
