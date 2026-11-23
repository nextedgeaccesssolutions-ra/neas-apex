/**
 * NEAS AI CORE — deterministic Master Brain routing and execution planning.
 *
 * This module plans work only. It does not call models, retrieve documents,
 * access connectors, mutate records, or execute external actions.
 */
export type NeasSpecialistId =
  | "engineering"
  | "project-management"
  | "safety"
  | "commercial"
  | "renewable-energy"
  | "business-development"
  | "marketing"
  | "procurement"
  | "training"
  | "legal-compliance"
  | "data-intelligence"
  | "executive";

export type NeasApprovalRequirement =
  | "preapproved-read-only"
  | "human-approval-required"
  | "blocked";

export interface NeasSpecialistDefinition {
  id: NeasSpecialistId;
  name: string;
  department: string;
  description: string;
  keywords: readonly string[];
  approvalBoundary: string;
}

export const NEAS_SPECIALISTS: readonly NeasSpecialistDefinition[] = [
  { id: "engineering", name: "NEAS ENGINEERING AI", department: "Engineering and Technical", description: "Rope access engineering, structural and technical calculations, industrial inspection, NDT, welding, maintenance, and technical documentation.", keywords: ["engineering", "rope access", "irata", "structural", "calculation", "ndt", "welding", "inspection", "maintenance", "anchor", "rigging", "technical"], approvalBoundary: "No design certification, anchor-capacity confirmation, or engineering sign-off." },
  { id: "project-management", name: "NEAS PROJECT MANAGEMENT AI", department: "Project Management and Operations", description: "Project planning, scheduling, resources, manpower, progress, dependencies, and reporting.", keywords: ["project", "schedule", "planning", "manpower", "resource", "progress", "milestone", "work breakdown", "wbs", "project report"], approvalBoundary: "Plans and reports are drafts until accepted by the project owner." },
  { id: "safety", name: "NEAS SAFETY AI", department: "HSEQ and Compliance", description: "HSE, risk assessments, JSA, method statements, emergency response, safety compliance, and audits.", keywords: ["safety", "hse", "hseq", "risk assessment", "jsa", "jha", "method statement", "rescue", "emergency", "permit to work", "work at height", "confined space", "audit"], approvalBoundary: "Cannot authorize site work or approve safety-critical controls." },
  { id: "commercial", name: "NEAS COMMERCIAL AI", department: "Finance and Commercial", description: "BOQ, estimates, quotations, pricing, profitability, cash flow, and financial forecasting.", keywords: ["boq", "quotation", "quote", "pricing", "cost", "estimate", "profit", "margin", "cash flow", "financial", "invoice", "vat", "billing"], approvalBoundary: "Commercial outputs remain drafts; pricing, quotations, and financial commitments require approval." },
  { id: "renewable-energy", name: "NEAS RENEWABLE ENERGY AI", department: "Renewable Energy", description: "Wind, solar, met mast, offshore and onshore renewable projects, and blade inspection and maintenance.", keywords: ["wind", "turbine", "solar", "renewable", "met mast", "offshore", "onshore", "blade", "lidar", "photovoltaic"], approvalBoundary: "No engineering or operational sign-off for energy assets." },
  { id: "business-development", name: "NEAS BUSINESS DEVELOPMENT AI", department: "Business Development and Sales", description: "Lead qualification, tenders, client acquisition, partnerships, and sales opportunity planning.", keywords: ["business development", "lead", "sales", "client", "tender", "bid", "opportunity", "partnership", "pipeline", "acquisition"], approvalBoundary: "External outreach, offers, and commitments require human approval." },
  { id: "marketing", name: "NEAS MARKETING AI", department: "Marketing and Global Expansion", description: "SEO, website optimization, digital marketing, content, social media, and conversion optimization.", keywords: ["marketing", "seo", "website", "search engine", "content", "social media", "campaign", "conversion", "brand", "keyword"], approvalBoundary: "May prepare content and recommendations; publishing and ad spend require approval." },
  { id: "procurement", name: "NEAS PROCUREMENT AI", department: "Procurement and Supply Chain", description: "Supplier records, material specifications, procurement planning, vendor comparisons, and inventory.", keywords: ["procurement", "supplier", "vendor", "material", "purchase", "inventory", "stock", "delivery", "purchase order"], approvalBoundary: "Purchase orders, supplier commitments, and spending require approval." },
  { id: "training", name: "NEAS TRAINING AI", department: "Training and Human Capital", description: "Rope access and GWO training, learning materials, competency matrices, and certification administration.", keywords: ["training", "gwo", "irata course", "competency", "assessment", "certification", "course", "trainee", "instructor"], approvalBoundary: "Cannot issue or validate a qualification or certification." },
  { id: "legal-compliance", name: "NEAS LEGAL AND COMPLIANCE AI", department: "Legal and Compliance", description: "Contract review assistance, compliance documentation, risk identification, and legal escalation.", keywords: ["legal", "contract", "agreement", "clause", "liability", "compliance", "regulatory", "claim", "dispute", "indemnity"], approvalBoundary: "Provides issue spotting only; legal advice and contractual decisions require qualified human review." },
  { id: "data-intelligence", name: "NEAS DATA INTELLIGENCE AI", department: "Data and Business Intelligence", description: "Internal data analysis, dashboards, predictive analytics, metrics, and performance reporting.", keywords: ["data", "dashboard", "analytics", "kpi", "performance", "forecast", "trend", "reporting", "database", "metrics"], approvalBoundary: "Uses only authorized internal datasets and reports data gaps." },
  { id: "executive", name: "NEAS EXECUTIVE AI", department: "Executive Management", description: "CEO decision support, strategy, corporate performance, enterprise risk, and business growth recommendations.", keywords: ["ceo", "executive", "strategy", "strategic", "corporate", "growth", "decision", "business plan", "company direction"], approvalBoundary: "Recommendations only; the authorized executive retains decision authority." },
] as const;

const APPROVAL_PATTERNS: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(send|email|publish|post|contact|message|submit|release)\b/i, reason: "External communication or publication requires human approval." },
  { pattern: /\b(quote|quotation|price|pricing|discount|purchase order|buy|procure|payment|transfer|spend|commit funds)\b/i, reason: "Commercial, purchasing, or financial commitment requires human approval." },
  { pattern: /\b(approve|sign off|certify|authorize)\b.{0,50}\b(safety|engineering|design|method statement|risk assessment|rescue|anchor|lifting|electrical|permit)\b/i, reason: "Safety-critical or engineering approval is reserved for an authorized competent person." },
  { pattern: /\b(deploy|production|dns|secret|credential|permission|security policy|delete|drop table|truncate)\b/i, reason: "Production, security, destructive, or permission changes require explicit authorization." },
  { pattern: /\b(update|change|edit|delete|create)\b.{0,50}\b(customer|client|employee|supplier|financial|payroll|contract)\b/i, reason: "Business-record changes require human approval." },
];

export function classifyNeasRequest(text: string): NeasApprovalRequirement {
  if (/\b(public web|web search|internet research|browse the web)\b/i.test(text)) return "blocked";
  if (APPROVAL_PATTERNS.some(({ pattern }) => pattern.test(text))) return "human-approval-required";
  return "preapproved-read-only";
}

export interface NeasMasterBrainPlan {
  objective: string;
  selectedAgents: Array<{ id: NeasSpecialistId; name: string; score: number }>;
  approval: NeasApprovalRequirement;
  approvalReasons: string[];
  executionMode: "analysis-and-draft-only";
  executionAllowed: false;
  knowledgeMode: "internal-only";
  notes: string[];
}


export type NeasTaskOperation =
  | "summarize_internal"
  | "draft_internal"
  | "plan_tasks"
  | "read_only_check"
  | "giie_public_research"
  | "send_external"
  | "issue_quote"
  | "commit_funds"
  | "approve_safety"
  | "change_production"
  | "mutate_business_record"
  | "commercialize_opportunity"
  | "arbitrary_shell"
  | "arbitrary_filesystem"
  | "arbitrary_network";

export type NeasTaskDisposition =
  | "queue_preapproved"
  | "await_human_approval"
  | "deny";

export interface NeasTaskExecutionDecision {
  disposition: NeasTaskDisposition;
  operation: NeasTaskOperation;
  requiresAuthenticatedPrincipal: true;
  requiresDurableAudit: true;
  requiresIdempotencyKey: true;
  requiresScopedToolGrant: true;
  requiresHumanApproval: boolean;
  reason: string;
}

const TASK_OPERATION_POLICY: Record<NeasTaskOperation, {
  disposition: NeasTaskDisposition;
  reason: string;
}> = {
  summarize_internal: { disposition: "queue_preapproved", reason: "Read-only analysis of owner-approved internal knowledge is preapproved." },
  draft_internal: { disposition: "queue_preapproved", reason: "Internal drafts may be prepared without sending or publishing." },
  plan_tasks: { disposition: "queue_preapproved", reason: "Task planning is allowed when it does not itself mutate external systems." },
  read_only_check: { disposition: "queue_preapproved", reason: "Read-only validation is allowed within an explicit tool scope." },
  giie_public_research: { disposition: "queue_preapproved", reason: "Lawful public research must execute only through the isolated GIIE public knowledge space." },
  send_external: { disposition: "await_human_approval", reason: "External communication requires explicit human approval." },
  issue_quote: { disposition: "await_human_approval", reason: "Quotations, prices and commercial offers require explicit human approval." },
  commit_funds: { disposition: "await_human_approval", reason: "Payments, purchases and financial commitments require explicit human approval." },
  approve_safety: { disposition: "deny", reason: "An AI agent cannot approve safety-critical or engineering work; a competent authorized person must decide." },
  change_production: { disposition: "await_human_approval", reason: "Production, DNS, security, deployment and credential changes require explicit human approval." },
  mutate_business_record: { disposition: "await_human_approval", reason: "Customer, employee, supplier and financial record changes require explicit human approval." },
  commercialize_opportunity: { disposition: "await_human_approval", reason: "Procurement, implementation and commercialization of opportunities require explicit human approval." },
  arbitrary_shell: { disposition: "deny", reason: "Arbitrary shell execution is never exposed to a specialist worker." },
  arbitrary_filesystem: { disposition: "deny", reason: "Unscoped filesystem access is never exposed to a specialist worker." },
  arbitrary_network: { disposition: "deny", reason: "Unrestricted network access is never exposed to a specialist worker." },
};

/**
 * Pure policy decision for a future durable task runner.
 *
 * This function does NOT enqueue, authorize a principal, grant tools, record an
 * audit event, or execute an operation. The caller must enforce those controls.
 */
export function decideNeasTaskExecution(
  operation: NeasTaskOperation,
  context: {
    authenticatedPrincipalId?: string | null;
    durableAuditAvailable: boolean;
    idempotencyKey?: string | null;
    scopedToolGrantAvailable: boolean;
    humanApprovalGranted?: boolean;
  },
): NeasTaskExecutionDecision {
  if (!Object.hasOwn(TASK_OPERATION_POLICY, operation)) {
    throw new Error("Unknown NEAS task operation.");
  }
  const rule = TASK_OPERATION_POLICY[operation];
  const base = {
    operation,
    requiresAuthenticatedPrincipal: true as const,
    requiresDurableAudit: true as const,
    requiresIdempotencyKey: true as const,
    requiresScopedToolGrant: true as const,
  };

  if (!context.authenticatedPrincipalId?.trim()) {
    return { ...base, disposition: "deny", requiresHumanApproval: false, reason: "An authenticated principal is required before a task can be accepted." };
  }
  if (!context.durableAuditAvailable) {
    return { ...base, disposition: "deny", requiresHumanApproval: false, reason: "Durable audit storage is unavailable; fail closed." };
  }
  if (!context.idempotencyKey?.trim() || context.idempotencyKey.length > 200) {
    return { ...base, disposition: "deny", requiresHumanApproval: false, reason: "A bounded idempotency key is required." };
  }
  if (!context.scopedToolGrantAvailable) {
    return { ...base, disposition: "deny", requiresHumanApproval: false, reason: "An explicit least-privilege tool grant is required." };
  }
  if (rule.disposition === "deny") {
    return { ...base, disposition: "deny", requiresHumanApproval: operation === "approve_safety", reason: rule.reason };
  }
  if (rule.disposition === "await_human_approval" && context.humanApprovalGranted !== true) {
    return { ...base, disposition: "await_human_approval", requiresHumanApproval: true, reason: rule.reason };
  }
  return {
    ...base,
    disposition: "queue_preapproved",
    requiresHumanApproval: false,
    reason: rule.reason,
  };
}

export function buildNeasMasterBrainPlan(objective: string, maxAgents = 3): NeasMasterBrainPlan {
  const normalized = objective.trim().toLowerCase();
  if (!normalized) throw new Error("A task objective is required.");
  if (!Number.isInteger(maxAgents) || maxAgents < 1 || maxAgents > 5) {
    throw new Error("maxAgents must be an integer between 1 and 5.");
  }

  const scored = NEAS_SPECIALISTS.map((agent, index) => ({
    agent,
    index,
    score: agent.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? Math.max(1, keyword.split(" ").length) : 0), 0),
  })).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxAgents);

  const approval = classifyNeasRequest(objective);
  const approvalReasons = approval === "human-approval-required"
    ? APPROVAL_PATTERNS.filter(({ pattern }) => pattern.test(objective)).map(({ reason }) => reason)
    : approval === "blocked" ? ["Public-web research is prohibited by the current internal-only knowledge policy."] : [];

  return {
    objective: objective.trim(),
    selectedAgents: scored.map(({ agent, score }) => ({ id: agent.id, name: agent.name, score })),
    approval,
    approvalReasons,
    executionMode: "analysis-and-draft-only",
    executionAllowed: false,
    knowledgeMode: "internal-only",
    notes: [
      "This is a routing and planning result, not proof that a specialist model has executed.",
      "Only approved NEAS internal documents and explicitly authorized company connectors may be used as evidence.",
      "No tools, external systems, or business records are modified by this planner.",
      ...(scored.length === 0 ? ["No specialist matched confidently; request clarification or route to the Executive AI for triage."] : []),
    ],
  };
}
