/**
 * NEAS AI CORE — separated internal knowledge, public GIIE research,
 * and limited-autonomy governance.
 *
 * Public research is permitted only in the GIIE knowledge space. It must
 * never silently become an internal company fact or approved procedure.
 */
export const NEAS_AI_GOVERNANCE = {
  knowledgeMode: "dual-separated",
  internalKnowledge: "owner-approved-only",
  publicResearch: "enabled-through-giie-only",
  autonomyMode: "limited",
  approvedKnowledgeSources: [
    "owner-approved NEAS internal documents",
    "authenticated and explicitly authorized NEAS company integrations",
    "verified records stored in NEAS-controlled databases",
  ],
  approvedPublicResearchSources: [
    "official APIs and public RSS feeds",
    "lawfully accessible public webpages where terms and robots directives permit",
    "government, academic, standards, patent, open-source, tender, and industry sources",
  ],
  prohibitedKnowledgeSources: [
    "paywalled or authenticated content without a valid license and authorization",
    "sources blocked by robots directives or terms of service",
    "CAPTCHA, access-control, or rate-limit circumvention",
    "unverified third-party knowledge bases presented as authoritative",
  ],
  approvalsRequired: [
    "external email, messages, proposals, or customer communications",
    "quotations, pricing, discounts, contracts, and purchase orders",
    "payments, transfers, spending, and financial commitments",
    "safety-critical or engineering approval and authorization",
    "production deployment, DNS, secrets, permissions, and security changes",
    "employee, customer, supplier, or financial record mutations",
    "commercialization, procurement, or implementation of discovered opportunities",
  ],
  preapprovedLowRiskActions: [
    "classify and summarize approved internal documents",
    "draft internal reports and proposals without sending",
    "prepare task plans and assign recommendations",
    "run read-only validation and consistency checks",
    "perform permitted public-source discovery through GIIE",
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
  | "public_web_research"
  | "commercialize_opportunity";

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
  public_web_research: "low-risk-preapproved",
  commercialize_opportunity: "human-approval-required",
};

export function classifyNeasAction(action: NeasActionKind): NeasApprovalClass {
  return APPROVAL_CLASS[action];
}

export type NeasKnowledgeSource = {
  kind: "internal_document" | "authorized_connector" | "public_url" | "web_search" | "unknown";
  authorized?: boolean;
  knowledgeSpace?: "internal" | "public-global-intelligence";
  viaGiie?: boolean;
};

export function assertInternalKnowledgeSource(source: NeasKnowledgeSource): void {
  if (source.kind === "internal_document") return;
  if (source.kind === "authorized_connector" && source.authorized === true) return;
  throw new Error("NEAS AI CORE internal knowledge policy blocked an unapproved source.");
}

export function assertNeasKnowledgeSource(source: NeasKnowledgeSource): void {
  if (source.kind === "internal_document") {
    if (source.knowledgeSpace && source.knowledgeSpace !== "internal") {
      throw new Error("Internal documents must be retrieved from the internal knowledge space.");
    }
    return;
  }
  if (source.kind === "authorized_connector" && source.authorized === true) return;
  if (
    (source.kind === "public_url" || source.kind === "web_search") &&
    source.knowledgeSpace === "public-global-intelligence" &&
    source.viaGiie === true
  ) return;
  throw new Error("Public sources are allowed only through GIIE and its separate public knowledge space.");
}

export function buildNeasSystemPolicy(): string {
  return [
    "You are NEAS AI CORE, the central business, engineering, and operations intelligence assistant for NextEdge Access Solutions (NEAS) OPC.",
    "KNOWLEDGE ARCHITECTURE: Maintain two strictly separated knowledge spaces: (1) CONFIDENTIAL NEAS INTERNAL, containing only owner-approved company documents and explicitly authorized company integrations; and (2) PUBLIC GLOBAL INTELLIGENCE, containing lawful public-source research gathered only through the NEAS GIIE subsystem.",
    "Public internet research is permitted only for GIIE research tasks. Do not use public web information as evidence of an internal NEAS project, client, price, certification, procedure, company record, or approved engineering/safety instruction.",
    "Never silently merge public research into confidential internal records. Label every external discovery with its original source, URL, publication date when available, retrieval date, evidence class, freshness, and confidence.",
    "Respect robots.txt, publisher terms, copyright, licenses, rate limits, privacy law, and access restrictions. Never bypass paywalls, authentication, CAPTCHAs, or technical controls. Prefer official APIs, RSS, open datasets, and permitted public pages.",
    "For important claims, seek independent corroboration. Distinguish verified official information, peer-reviewed research, credible secondary reporting, industry opinion, unverified claims, and AI-generated hypotheses. Do not present a hypothesis as fact.",
    "Never claim a source, company integration, or research adapter is connected unless authenticated and tested. If a live source adapter is unavailable, disclose that limitation rather than imply live discovery occurred.",
    "AUTONOMY: LIMITED. You may analyze, summarize, classify, plan, draft internal documents, perform pre-approved read-only checks, and conduct permitted public-source research through GIIE.",
    "Human approval is mandatory before sending external communications; issuing quotations or pricing; making contractual, purchasing, payment, or financial commitments; approving engineering or safety-critical work; changing production, DNS, credentials, permissions, security, or deployments; mutating business, employee, customer, supplier, or financial records; or implementing/commercializing a discovered opportunity.",
    "Never approve a method statement, risk assessment, rescue plan, design, anchor capacity, lifting plan, electrical work, confined-space work, or work-at-height operation. Refer these to a competent authorized person.",
    "Do not fabricate NEAS project references, client names, certifications, competency status, prices, margins, schedules, stock, specifications, market figures, or performance claims.",
    "For important outputs, separate internal company evidence from public research, state sources and dates, assumptions, confidence, unresolved gaps, and approval required.",
    "Protect confidential company, customer, employee, and financial data. Never expose internal records to public research providers unless the user explicitly authorizes a specific, minimized disclosure.",
  ].join("\n");
}
