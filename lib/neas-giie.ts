/**
 * NEAS GIIE — Global Intelligence Discovery Engine.
 *
 * This module defines source governance, normalized discovery records,
 * verification labels, opportunity scoring, and an innovation pipeline.
 * It intentionally does not crawl websites, call search providers, persist
 * records, or execute business actions. Those require separately configured
 * provider adapters, database migrations, and authorization.
 */

export type GiieKnowledgeSpace = "public-global-intelligence" | "confidential-neas-internal";
export type GiieEvidenceClass =
  | "verified-official"
  | "peer-reviewed-research"
  | "credible-secondary"
  | "industry-opinion"
  | "unverified-claim"
  | "ai-generated-hypothesis";

export type GiieDiscoveryStatus =
  | "discovered"
  | "extracted"
  | "classified"
  | "verification-pending"
  | "verified"
  | "contradicted"
  | "archived";

export type GiiePipelineStage =
  | "discover"
  | "extract"
  | "classify"
  | "verify"
  | "analyze"
  | "connect"
  | "evaluate"
  | "develop-idea"
  | "assess-feasibility"
  | "recommend"
  | "approval-required"
  | "implement"
  | "measure";

export type GiieSourceType =
  | "official-api"
  | "rss"
  | "public-webpage"
  | "government"
  | "standards-organization"
  | "peer-reviewed-journal"
  | "academic-repository"
  | "patent-database"
  | "open-source-repository"
  | "public-tender-portal"
  | "industry-publication"
  | "public-forum"
  | "public-video";

export interface GiieSourcePolicy {
  type: GiieSourceType;
  enabled: boolean;
  requiresApiKey: boolean;
  allowCrawling: boolean;
  notes: string;
}

export const GIIE_SOURCE_POLICIES: readonly GiieSourcePolicy[] = [
  { type: "official-api", enabled: true, requiresApiKey: true, allowCrawling: false, notes: "Use provider-approved API endpoints and documented quotas." },
  { type: "rss", enabled: true, requiresApiKey: false, allowCrawling: false, notes: "Use publisher-provided public feeds and conditional requests where supported." },
  { type: "public-webpage", enabled: true, requiresApiKey: false, allowCrawling: true, notes: "Fetch only publicly accessible pages where terms and robots directives permit." },
  { type: "government", enabled: true, requiresApiKey: false, allowCrawling: true, notes: "Prefer official open-data portals, APIs, and published notices." },
  { type: "standards-organization", enabled: true, requiresApiKey: false, allowCrawling: false, notes: "Store metadata and lawful summaries; do not reproduce protected standards text." },
  { type: "peer-reviewed-journal", enabled: true, requiresApiKey: false, allowCrawling: false, notes: "Use lawful abstracts, metadata, open-access full text, or licensed APIs only." },
  { type: "academic-repository", enabled: true, requiresApiKey: false, allowCrawling: true, notes: "Respect repository license, robots directives, and rate limits." },
  { type: "patent-database", enabled: true, requiresApiKey: false, allowCrawling: false, notes: "Prefer official patent search interfaces and public bibliographic metadata." },
  { type: "open-source-repository", enabled: true, requiresApiKey: true, allowCrawling: false, notes: "Use official APIs; respect licenses, quotas, and repository terms." },
  { type: "public-tender-portal", enabled: true, requiresApiKey: false, allowCrawling: true, notes: "Use public notices and authorized feeds; never automate bid submission." },
  { type: "industry-publication", enabled: true, requiresApiKey: false, allowCrawling: false, notes: "Use licensed feeds or permitted public summaries and source links." },
  { type: "public-forum", enabled: true, requiresApiKey: false, allowCrawling: false, notes: "Treat as opinion or anecdotal evidence, not verified fact." },
  { type: "public-video", enabled: true, requiresApiKey: true, allowCrawling: false, notes: "Use official metadata APIs and creator-authorized transcripts only." },
] as const;

export const GIIE_RESEARCH_AGENTS = [
  { id: "global-technology", name: "Global Technology Researcher", focus: "Emerging technology, industrial innovation, digital systems" },
  { id: "engineering-innovation", name: "Engineering Innovation Researcher", focus: "Rope access, inspection, construction, maintenance engineering" },
  { id: "renewable-energy", name: "Renewable Energy Researcher", focus: "Wind, solar, met mast, offshore and onshore renewables" },
  { id: "offshore-onshore", name: "Offshore and Onshore Intelligence Researcher", focus: "Energy, marine, power and industrial operations" },
  { id: "tenders-projects", name: "Global Tender and Project Researcher", focus: "Public tenders, project announcements, procurement notices" },
  { id: "competitor-intelligence", name: "Competitor Intelligence Researcher", focus: "Public competitor services, positioning, projects and partnerships" },
  { id: "industrial-market", name: "Industrial Market Researcher", focus: "Industrial maintenance, telecom, power plants, NDT and inspection" },
  { id: "ai-automation", name: "AI and Automation Researcher", focus: "AI systems, robotics, workflow and operational automation" },
  { id: "scientific-research", name: "Scientific Research Analyst", focus: "Peer-reviewed research and technical evidence" },
  { id: "business-opportunity", name: "Business Opportunity Discovery Agent", focus: "Translate discoveries into feasible NEAS business opportunities" },
  { id: "patent-innovation", name: "Patent and Innovation Researcher", focus: "Public patent metadata, invention landscape and IP signals" },
  { id: "knowledge-verification", name: "Knowledge Verification Agent", focus: "Provenance, corroboration, contradictions, freshness and confidence" },
] as const;

export interface GiieDiscovery {
  id: string;
  knowledgeSpace: "public-global-intelligence";
  title: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: GiieSourceType;
  publishedAt?: string;
  discoveredAt: string;
  authorOrOrganization?: string;
  subjects: string[];
  coreConcept: string;
  problem?: string;
  proposedSolution?: string;
  technology?: string[];
  industries: string[];
  geography?: string[];
  evidenceClass: GiieEvidenceClass;
  status: GiieDiscoveryStatus;
  sourceExcerpt?: string;
  lawfulSummary: string;
  relatedDiscoveryIds: string[];
  corroboratingSourceUrls: string[];
  contradictionNotes: string[];
  confidence: number;
  freshnessDays?: number;
  copyrightOrLicenseNotes?: string;
}

export interface GiieOpportunityAssessment {
  discoveryId: string;
  opportunity: string;
  targetIndustry: string[];
  targetGeographies: string[];
  potentialClientSegments: string[];
  requiredCompetencies: string[];
  requiredEquipment: string[];
  estimatedInvestment: { amount?: number; currency?: string; basis: string; confidence: "quoted" | "estimated" | "unknown" };
  revenueModel: string;
  commercialFeasibility: "high" | "medium" | "low" | "undetermined";
  implementationRoadmap: string[];
  risks: string[];
  recommendedNextAction: string;
  evidenceGaps: string[];
  approvalRequired: true;
}

export function validatePublicDiscovery(input: GiieDiscovery): string[] {
  const errors: string[] = [];
  if (input.knowledgeSpace !== "public-global-intelligence") errors.push("Public discoveries must remain in the public-global-intelligence knowledge space.");
  try {
    const url = new URL(input.sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") errors.push("Source URL must use HTTP or HTTPS.");
  } catch { errors.push("A valid original source URL is required."); }
  if (!input.title.trim()) errors.push("Discovery title is required.");
  if (!input.sourceName.trim()) errors.push("Source name is required.");
  if (!input.lawfulSummary.trim()) errors.push("A lawful, attributed summary is required.");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) errors.push("Confidence must be between 0 and 1.");
  if (input.publishedAt && Number.isNaN(Date.parse(input.publishedAt))) errors.push("publishedAt must be a valid date.");
  if (input.discoveredAt && Number.isNaN(Date.parse(input.discoveredAt))) errors.push("discoveredAt must be a valid date.");
  return errors;
}

export function classifyEvidence(input: {
  officialPrimarySource?: boolean;
  peerReviewed?: boolean;
  credibleIndependentSources?: number;
  opinionOrForum?: boolean;
  verified?: boolean;
}): GiieEvidenceClass {
  if (input.verified && input.officialPrimarySource) return "verified-official";
  if (input.peerReviewed) return "peer-reviewed-research";
  if ((input.credibleIndependentSources ?? 0) >= 2) return "credible-secondary";
  if (input.opinionOrForum) return "industry-opinion";
  return "unverified-claim";
}

export function scoreNeasRelevance(input: {
  industryMatch: number;
  geographyMatch: number;
  credibility: number;
  commercialValue: number;
  urgency: number;
  feasibility: number;
}): number {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("All relevance dimensions must be between 0 and 100.");
  }
  // Industry relevance and credibility are weighted most heavily.
  return Math.round(
    input.industryMatch * 0.25 +
    input.credibility * 0.25 +
    input.commercialValue * 0.20 +
    input.feasibility * 0.15 +
    input.geographyMatch * 0.10 +
    input.urgency * 0.05
  );
}

export function isIndependentCorroboration(sourceUrls: string[]): boolean {
  const hosts = new Set<string>();
  for (const raw of sourceUrls) {
    try { hosts.add(new URL(raw).hostname.toLowerCase().replace(/^www\./, "")); } catch { /* invalid source is not corroboration */ }
  }
  return hosts.size >= 2;
}

export const GIIE_PIPELINE: readonly GiiePipelineStage[] = [
  "discover", "extract", "classify", "verify", "analyze", "connect", "evaluate",
  "develop-idea", "assess-feasibility", "recommend", "approval-required", "implement", "measure",
];

export const GIIE_GOVERNANCE = {
  publicResearchEnabled: true,
  publicAndInternalKnowledgeMustRemainSeparate: true,
  externalSourcesAreNotAuthoritativeCompanyProcedures: true,
  neverBypassPaywallsAuthenticationCaptchaOrAccessControls: true,
  respectRobotsTermsRateLimitsCopyrightAndPrivacy: true,
  storeMetadataAndLawfulSummariesRatherThanBulkWebsiteCopies: true,
  externalCommunicationAndCommercializationRequireApproval: true,
  automatedBidSubmissionDisabled: true,
  autonomousProductionChangesDisabled: true,
} as const;
