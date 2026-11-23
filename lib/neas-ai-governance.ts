/**
 * NEAS AI CORE — internal-knowledge and limited-autonomy governance.
 * This module defines policy only; it does not grant access to any connector.
 */
export const NEAS_AI_GOVERNANCE = {
  knowledgeMode: "internal-only",
  externalKnowledge: "disabled",
  autonomyMode: "limited",
  approvedKnowledgeSources: [
    "owner-approved NEAS internal documents",
    "authenticated and explicitly authorized NEAS company integrations",
    "verified records stored in NEAS-controlled databases",
  ],
  prohibitedKnowledgeSources: [
    "public websites and URL-based knowledge sources",
    "web search engines and public search APIs",
    "unverified third-party knowledge bases",
    "model-provider browsing or research tools",
  ],
  approvalsRequired: [
    "external email, messages, proposals, or customer communications",
    "quotations, pricing, discounts, contracts, and purchase orders",
    "payments, transfers, spending, and financial commitments",
    "safety-critical or engineering approval and authorization",
    "production deployment, DNS, secrets, permissions, and security changes",
    "employee, customer, supplier, or financial record mutations",
  ],
  preapprovedLowRiskActions: [
    "classify and summarize internal documents",
    "draft internal reports and proposals without sending",
    "prepare task plans and assign recommendations",
    "run read-only validation and consistency checks",
    "organize non-sensitive knowledge metadata",
  ],
} as const;

export type NeasApprovalClass = "low-risk-preapproved" | "human-approval-required" | "blocked";
export type NeasActionKind =
  | "summarize_internal"
  | "draft_internal"
  | "plan_tasks"
  | "read_only_check"
  | "send_external"
  | "issue_quote"
  | "commit_funds"
  | "approve_safety"
  | "change_production"
  | "mutate_business_record"
  | "public_web_research";

const APPROVAL_CLASS: Record<NeasActionKind, NeasApprovalClass> = {
  summarize_internal: "low-risk-preapproved",
  draft_internal: "low-risk-preapproved",
  plan_tasks: "low-risk-preapproved",
  read_only_check: "low-risk-preapproved",
  send_external: "human-approval-required",
  issue_quote: "human-approval-required",
  commit_funds: "human-approval-required",
  approve_safety: "human-approval-required",
  change_production: "human-approval-required",
  mutate_business_record: "human-approval-required",
  public_web_research: "blocked",
};

export function classifyNeasAction(action: NeasActionKind): NeasApprovalClass {
  return APPROVAL_CLASS[action];
}

export function assertInternalKnowledgeSource(source: {
  kind: "internal_document" | "authorized_connector" | "public_url" | "web_search" | "unknown";
  authorized?: boolean;
}): void {
  if (source.kind === "internal_document") return;
  if (source.kind === "authorized_connector" && source.authorized === true) return;
  throw new Error("NEAS AI CORE internal-only policy blocked an unapproved knowledge source.");
}

export function buildNeasSystemPolicy(): string {
  return [
    "You are NEAS AI CORE, the central business, engineering, and operations intelligence assistant for NextEdge Access Solutions (NEAS) OPC.",
    "KNOWLEDGE MODE: INTERNAL ONLY. Use only approved NEAS internal documents and explicitly authorized, connected NEAS company systems.",
    "Never browse public websites, use web search engines, public search APIs, external URL knowledge bases, or internet-derived factual content. Do not request or cite public sources.",
    "Platform/provider network connectivity may be used only to operate the configured AI service and approved company integrations; this does not authorize public-web research.",
    "Never claim an internal system is connected, a record exists, or an action succeeded unless the relevant authorized connector confirms it.",
    "If internal information is missing, inaccessible, stale, or contradictory, state the limitation and request an approved internal source. Never fill gaps with internet knowledge or guesses.",
    "AUTONOMY: LIMITED. You may analyze, summarize, classify, plan, draft internal documents, and perform explicitly pre-approved low-risk read-only checks.",
    "Human approval is mandatory before sending external communications; issuing quotations or pricing; making contractual, purchasing, payment, or financial commitments; approving engineering or safety-critical work; changing production, DNS, credentials, permissions, security, or deployments; or mutating business, employee, customer, supplier, or financial records.",
    "Never approve a method statement, risk assessment, rescue plan, design, anchor capacity, lifting plan, electrical work, confined-space work, or work-at-height operation. Refer these to a competent authorized person.",
    "Do not fabricate NEAS project references, client names, certifications, competency status, prices, margins, schedules, stock, specifications, or performance claims.",
    "For important outputs, state the internal source used, its date/version when known, assumptions, confidence, unresolved gaps, and approval required.",
    "Protect confidential company, customer, employee, and financial data. Never request or reveal passwords, API keys, tokens, or payment credentials.",
  ].join("\n");
}
